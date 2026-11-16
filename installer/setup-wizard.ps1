param([string]$AppDir = (Split-Path -Parent $PSScriptRoot), [switch]$Preview, [string]$CaptureDir)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationFramework,PresentationCore,WindowsBase
$AppDir = [IO.Path]::GetFullPath($AppDir)
$script:Mode = 'cloud'
$script:Method = ''
$script:Stage = 'Welcome'
$script:Busy = $false
$script:Consent = $false
$script:Model = 'google/gemma-4-e4b'
$script:LastTask = ''
$script:StatusFile = ''
$script:Worker = $null
$script:LogFile = ''
$script:Slide = 0
$script:AfterPrepare = $false
$script:Lock = $null
if (!$Preview) {
  $stateDir = Join-Path $AppDir '.setup'
  New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
  try { $script:Lock = [IO.File]::Open((Join-Path $stateDir 'wizard.lock'), 'OpenOrCreate', 'ReadWrite', 'None') }
  catch { [Windows.MessageBox]::Show('Мастер настройки уже открыт. Вернитесь в его окно.', 'Салфетка') | Out-Null; exit 0 }
}
[xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" Title="Салфетка — установка и первый запуск" Width="840" Height="760" MinWidth="700" MinHeight="620" WindowStartupLocation="CenterScreen" Background="#FFFFFF" FontFamily="Segoe UI" Foreground="#17283B">
 <Window.Resources>
  <Style TargetType="Button"><Setter Property="FontSize" Value="14"/><Setter Property="Padding" Value="18,12"/><Setter Property="Cursor" Value="Hand"/><Setter Property="Background" Value="#F2F6FA"/><Setter Property="Foreground" Value="#17283B"/><Setter Property="BorderThickness" Value="0"/><Setter Property="Template"><Setter.Value><ControlTemplate TargetType="Button"><Border Background="{TemplateBinding Background}" CornerRadius="9" Padding="{TemplateBinding Padding}"><ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/></Border><ControlTemplate.Triggers><Trigger Property="IsMouseOver" Value="True"><Setter Property="Opacity" Value="0.85"/></Trigger><Trigger Property="IsEnabled" Value="False"><Setter Property="Opacity" Value="0.4"/></Trigger><Trigger Property="IsKeyboardFocused" Value="True"><Setter Property="BorderThickness" Value="2"/><Setter Property="BorderBrush" Value="#258DE8"/></Trigger></ControlTemplate.Triggers></ControlTemplate></Setter.Value></Setter></Style>
 </Window.Resources>
 <Grid><Grid.RowDefinitions><RowDefinition Height="76"/><RowDefinition Height="Auto"/><RowDefinition Height="*"/><RowDefinition Height="Auto"/></Grid.RowDefinitions>
  <Border BorderBrush="#E5EBF2" BorderThickness="0,0,0,1"><Grid Margin="28,8"><Grid.ColumnDefinitions><ColumnDefinition Width="64"/><ColumnDefinition Width="*"/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions><Image x:Name="Logo" Width="58" Height="54" Stretch="Uniform"/><StackPanel Grid.Column="1" VerticalAlignment="Center" Margin="12,0"><TextBlock Text="Салфетка" FontSize="23" FontWeight="SemiBold"/><TextBlock Text="Установка и первый запуск" Foreground="#617084" FontSize="12"/></StackPanel><TextBlock x:Name="PreviewLabel" Grid.Column="2" Text="" Foreground="#617084" VerticalAlignment="Center"/></Grid></Border>
  <TextBlock x:Name="Steps" Grid.Row="1" Margin="38,22,38,0" Foreground="#258DE8" FontSize="12" Text="1. Подготовить программу     →     2. Настроить нейросеть     →     3. Создать схему" TextWrapping="Wrap"/>
  <ScrollViewer x:Name="Scroller" Grid.Row="2" VerticalScrollBarVisibility="Auto" HorizontalScrollBarVisibility="Disabled"><StackPanel x:Name="Content" Margin="38,28,38,28"/></ScrollViewer>
  <Border Grid.Row="3" BorderBrush="#E5EBF2" BorderThickness="0,1,0,0" Padding="28,18"><Grid><Grid.ColumnDefinitions><ColumnDefinition Width="Auto"/><ColumnDefinition Width="*"/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions><Button x:Name="Back" Content="Назад" Background="Transparent" Foreground="#617084"/><TextBlock x:Name="Footer" Grid.Column="1" Text="Настроим всё по шагам" FontSize="11" Foreground="#617084" VerticalAlignment="Center" Margin="16,0" TextWrapping="Wrap"/><Button x:Name="Next" Grid.Column="2" Content="Начать" Background="#258DE8" Foreground="White" FontWeight="SemiBold"/></Grid></Border>
 </Grid>
</Window>
'@
$window = [Windows.Markup.XamlReader]::Load([Xml.XmlNodeReader]::new($xaml))
$content = $window.FindName('Content'); $next = $window.FindName('Next'); $back = $window.FindName('Back'); $footer = $window.FindName('Footer')
$logoPath = Join-Path $AppDir 'apps\web\public\brand\logo.png'
if (Test-Path -LiteralPath $logoPath) { $window.FindName('Logo').Source = [Windows.Media.Imaging.BitmapImage]::new([Uri]$logoPath) }
$window.Icon = [Windows.Media.Imaging.BitmapFrame]::Create([Uri](Join-Path $AppDir 'apps\web\public\brand\favicon-64.png'))
if ($Preview) { $window.FindName('PreviewLabel').Text = 'Предпросмотр · без установки' }
function Text($value, $size=15, $color='#617084', $weight='Normal') {
  $t = [Windows.Controls.TextBlock]::new(); $t.Text=$value; $t.FontSize=$size; $t.Foreground=$color; $t.FontWeight=$weight
  $t.TextWrapping='Wrap'; $t.LineHeight=$size*1.5; $t.Margin='0,0,0,14'; return $t
}
function Add-Text($value, $size=15, $color='#617084', $weight='Normal') { $content.Children.Add((Text $value $size $color $weight)) | Out-Null }
function Heading($tag,$title,$description) { Add-Text $tag 11 '#258DE8' 'SemiBold'; Add-Text $title 30 '#17283B' 'SemiBold'; Add-Text $description }
function Hint($value) {
  $b=[Windows.Controls.Border]::new();$b.Background='#F3F7FB';$b.CornerRadius=10;$b.Padding=18;$b.Margin='0,12,0,16'
  $t=Text $value 13; $t.Margin=0; $b.Child=$t;$content.Children.Add($b)|Out-Null
}
function Choice($title,$description,$selected,$action) {
  $b=[Windows.Controls.Button]::new();$b.HorizontalContentAlignment='Stretch';$b.Margin='0,0,0,12';$b.Padding='20,18'
  if($selected){$b.Background='#EAF4FF'}else{$b.Background='#F3F7FB'}
  $panel=[Windows.Controls.StackPanel]::new();$panel.Width=550;$panel.HorizontalAlignment='Left'
  $panel.Children.Add((Text ($(if($selected){'●  '}else{'○  '})+$title) 18 '#17283B' 'SemiBold'))|Out-Null
  $t=Text $description 13;$t.Margin=0;$panel.Children.Add($t)|Out-Null;$b.Content=$panel
  $b.Add_Click($action);$content.Children.Add($b)|Out-Null
}
function Link($caption,$url) {
  $b=[Windows.Controls.Button]::new();$b.Content=$caption;$b.Margin='0,0,12,12';$b.HorizontalAlignment='Left'
  $b.Tag=$url;$b.Add_Click({param($sender,$e) Start-Process -FilePath $sender.Tag});$content.Children.Add($b)|Out-Null
}
function Model-Picker {
  Add-Text 'Модель для вашего компьютера' 13 '#17283B' 'SemiBold'
  $combo=[Windows.Controls.ComboBox]::new();$combo.FontSize=14;$combo.Padding=10;$combo.Margin='0,0,0,14'
  $combo.Items.Add('Лёгкая — Gemma 4 E4B (для начала, видеокарта от 8 ГБ)')|Out-Null
  $combo.Items.Add('Крупнее — Gemma 4 12B QAT (видеокарта от 12–16 ГБ)')|Out-Null
  $combo.SelectedIndex=$(if($script:Model -eq 'google/gemma-4-e4b'){0}else{1})
  $combo.Add_SelectionChanged({param($sender,$e) $script:Model=$(if($sender.SelectedIndex -eq 0){'google/gemma-4-e4b'}else{'google/gemma-4-12b-qat'});$script:Consent=$false; if($script:Stage -eq 'Consent'){$next.IsEnabled=$false;if($script:ConsentBox){$script:ConsentBox.IsChecked=$false}} })
  $content.Children.Add($combo)|Out-Null
}
function Set-Stage($stage){$script:Stage=$stage;Render;$window.FindName('Scroller').ScrollToTop()}
function Start-Work($task) {
  if($task -eq 'Automatic' -and !$script:Consent){return}
  $script:LastTask=$task;$script:Busy=$true;Set-Stage 'Working'
  $stateDir=Join-Path $AppDir '.setup';if($Preview){$stateDir=Join-Path ([IO.Path]::GetTempPath()) 'salfetka-preview'}
  New-Item -ItemType Directory -Force -Path $stateDir|Out-Null
  $script:StatusFile=Join-Path $stateDir (([Guid]::NewGuid().ToString('N'))+'.json')
  $params='-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+(Join-Path $PSScriptRoot 'setup-worker.ps1')+'" -AppDir "'+$AppDir+'" -Task '+$task+' -StatusFile "'+$script:StatusFile+'" -Model '+$script:Model
  if($task -eq 'Automatic'){$params+=' -Consent'}
  if($Preview){$params+=' -Simulation'}
  try {$script:Worker=Start-Process -FilePath 'powershell.exe' -ArgumentList $params -WindowStyle Hidden -PassThru}
  catch {$script:Busy=$false;$script:ErrorDetail='Не удалось запустить настройку. '+$_.Exception.Message;Set-Stage 'Error'}
}
function Render {
  $content.Children.Clear();$next.IsEnabled=$true;$next.Visibility='Visible';$back.Visibility='Visible';$back.IsEnabled=$true
  $footer.Text='Настроим всё по шагам';$script:NextAction={};$script:BackAction={Set-Stage 'Mode'}
  switch($script:Stage){
    'Welcome'{
      Heading 'ТЕКСТ СТАНОВИТСЯ НАГЛЯДНЫМ' 'Ваши идеи — в понятных схемах' 'Вставьте небольшой текст, получите схему и сохраните её для презентации, документа или публикации.'
      Hint "1. Вставьте абзац или список`n2. Нажмите «Визуализировать»`n3. Поправьте оформление и скачайте картинку"
      Add-Text 'Сначала подготовим программу' 18 '#17283B' 'SemiBold'
      Add-Text 'Проверим Node.js и установим его при необходимости, затем скачаем компоненты Салфетки. Нужен интернет. Windows может запросить разрешение.' 14
      Add-Text 'LM Studio и модель на этом шаге не устанавливаются — вы выберете способ работы отдельно.' 13
      $next.Content='Подготовить Салфетку →';$back.Visibility='Hidden';$script:NextAction={Start-Work 'Prepare'}
      if($script:AfterPrepare){$next.Content='Продолжить →';$script:NextAction={Set-Stage 'Mode'}}
    }
    'Mode'{
      Heading 'ПРОГРАММА ПОДГОТОВЛЕНА' 'Где будет работать нейросеть?' 'Она прочитает текст и предложит структуру схемы. Способ работы можно изменить позже.'
      Choice 'Через интернет' 'Не нужна мощная видеокарта. Нужны регистрация в OpenRouter и ключ доступа. Текст отправляется стороннему сервису; у бесплатных моделей есть лимиты.' ($script:Mode -eq 'cloud') {$script:Mode='cloud';Render}
      Choice 'На компьютере' 'Нужны подходящая видеокарта и загрузка модели. Текст обрабатывается на вашем устройстве. После настройки можно работать без интернета.' ($script:Mode -eq 'local') {$script:Mode='local';Render}
      Add-Text 'Не знаете, что выбрать? Можно начать с варианта через интернет.' 13
      $next.Content='Продолжить →';$script:NextAction={if($script:Mode -eq 'cloud'){Set-Stage 'Cloud'}else{Set-Stage 'Method'}};$script:BackAction={Set-Stage 'Welcome'}
    }
    'Cloud'{
      Heading 'РАБОТА ЧЕРЕЗ ИНТЕРНЕТ' 'Подключите OpenRouter в Салфетке' 'После запуска откроется окно с инструкцией и полем для ключа. Здесь ключ вводить не нужно.'
      Hint "1. Зарегистрируйтесь в OpenRouter.`n2. На странице API Keys нажмите Create Key.`n3. Скопируйте ключ и вставьте его в Салфетке.`n4. Нажмите «Проверить ключ» и выберите бесплатную модель."
      Link 'Открыть сайт OpenRouter ↗' 'https://openrouter.ai/'
      Add-Text 'Сама Салфетка не требует регистрации. Для работы через интернет используется отдельный аккаунт OpenRouter.' 13
      $next.Content='Завершить настройку →';$script:NextAction={Start-Work 'Cloud'}
    }
    'Method'{
      Heading 'РАБОТА НА КОМПЬЮТЕРЕ' 'Как установить LM Studio?' 'LM Studio запускает нейросеть на вашем устройстве. Выберите, кто подготовит программу и модель.'
      Choice 'Установлю самостоятельно' 'Покажем, где скачать программу, какую модель выбрать и как включить подключение. Подойдёт, если LM Studio уже установлена.' ($script:Method -eq 'manual') {$script:Method='manual';Render}
      Choice 'Установите за меня' 'Мастер установит LM Studio, скачает выбранную модель и настроит подключение. Перед началом попросим ваше согласие.' ($script:Method -eq 'auto') {$script:Method='auto';Render}
      Add-Text 'Без согласия мастер не установит LM Studio и не скачает модель.' 13
      $next.IsEnabled=($script:Method -ne '');$next.Content='Продолжить →';$script:NextAction={if($script:Method -eq 'auto'){Set-Stage 'Consent'}else{Set-Stage 'Manual'}}
    }
    'Consent'{
      Heading 'АВТОМАТИЧЕСКАЯ НАСТРОЙКА' 'Разрешить установку?' 'Мастер установит LM Studio, если её ещё нет, скачает выбранную модель, загрузит её в память и проверит подключение.'
      Model-Picker
      Hint 'Нужен интернет и не менее 12 ГБ свободного места на диске профиля пользователя. Модель займёт несколько гигабайт; размер зависит от выбранного файла. Windows может запросить разрешение. При первом открытии LM Studio может потребоваться пройти её приветствие.'
      $script:ConsentBox=[Windows.Controls.CheckBox]::new();$script:ConsentBox.FontSize=14;$script:ConsentBox.Margin='0,14,0,14'
      $consentText=Text 'Разрешаю установить LM Studio, скачать модели для схем и подбора значков и настроить их для Салфетки на этом компьютере.' 14 '#17283B'
      $consentText.MaxWidth=550;$script:ConsentBox.Content=$consentText
      $script:ConsentBox.IsChecked=$script:Consent
      $script:ConsentBox.Add_Checked({$script:Consent=$true;$next.IsEnabled=$true});$script:ConsentBox.Add_Unchecked({$script:Consent=$false;$next.IsEnabled=$false})
      $content.Children.Add($script:ConsentBox)|Out-Null
      $next.Content='Разрешаю установить';$next.IsEnabled=$script:Consent;$script:NextAction={Start-Work 'Automatic'};$script:BackAction={$script:Consent=$false;Set-Stage 'Method'}
    }
    'Manual'{
      Heading 'САМОСТОЯТЕЛЬНАЯ УСТАНОВКА' 'Подготовьте LM Studio' 'Мастер не устанавливает LM Studio и не скачивает модели. Если всё уже настроено, сразу переходите к проверке.'
      Model-Picker
      Link 'Скачать LM Studio с официального сайта ↗' 'https://lmstudio.ai/download'
      Add-Text ("1. Установите и откройте LM Studio.`n2. В поиске моделей найдите: "+$script:Model+".`n3. Скачайте модель и загрузите её в память.`n4. Откройте Developer и включите сервер (Start Server).`n5. Вернитесь сюда и нажмите «Проверить готовность».") 14
      Hint 'Мастер проверит подключение и отправит короткий пробный запрос «Ответь одним словом: готово». Ваши документы не используются.'
      $next.Content='Проверить готовность';$script:NextAction={Start-Work 'Manual'};$script:BackAction={Set-Stage 'Method'}
    }
    'Working'{
      Heading 'НАСТРАИВАЕМ ВСЁ ПО ШАГАМ' 'Пожалуйста, подождите' 'Не закрывайте мастер до завершения текущей операции.'
      $script:StatusText=Text 'Запускаем настройку…' 18 '#17283B' 'SemiBold';$content.Children.Add($script:StatusText)|Out-Null
      $bar=[Windows.Controls.ProgressBar]::new();$bar.Height=7;$bar.IsIndeterminate=$true;$bar.Foreground='#258DE8';$bar.Background='#EDF2F7';$bar.BorderThickness=0;$bar.Margin='0,4,0,18';$content.Children.Add($bar)|Out-Null
      $script:DetailText=Text 'Интернет и скорость компьютера влияют на время ожидания.' 13;$content.Children.Add($script:DetailText)|Out-Null
      $script:Showcase=Text '' 18 '#17283B' 'SemiBold';$script:Showcase.Margin='0,28,0,14';$content.Children.Add($script:Showcase)|Out-Null
      $script:ShowcaseDetail=Text '' 14;$content.Children.Add($script:ShowcaseDetail)|Out-Null;Update-Slide
      $slideButtons=[Windows.Controls.StackPanel]::new();$slideButtons.Orientation='Horizontal'
      foreach($number in 0..2){$b=[Windows.Controls.Button]::new();$b.Content=($number+1).ToString();$b.Tag=$number;$b.Margin='0,4,8,4';$b.Add_Click({param($sender,$e) $script:Slide=[int]$sender.Tag;Update-Slide});$slideButtons.Children.Add($b)|Out-Null};$content.Children.Add($slideButtons)|Out-Null
      $next.Visibility='Hidden';$back.Content='Остановить';$footer.Text='Подробности сохраняются в журнале настройки'
      $script:BackAction={
        $answer=[Windows.MessageBox]::Show('Остановить текущую настройку? Уже установленные компоненты останутся на компьютере. Позже настройку можно повторить.','Салфетка','YesNo','Question')
        if($answer -eq 'Yes'){
          $script:Busy=$false
          if($script:Worker -and !$script:Worker.HasExited){Start-Process -FilePath 'taskkill.exe' -ArgumentList @('/PID',$script:Worker.Id,'/T','/F') -WindowStyle Hidden -Wait|Out-Null}
          $script:ErrorDetail='Настройка остановлена по вашему запросу. Можно повторить попытку или выбрать другой способ работы.';Set-Stage 'Error'
        }
      }
    }
    'Error'{
      Heading 'МОЖНО ПОПРОБОВАТЬ ЕЩЁ РАЗ' 'Настройку пока не удалось завершить' $script:ErrorDetail
      Hint 'Установленная программа останется на компьютере. Вы можете повторить попытку или вернуться и выбрать другой способ работы.'
      if($script:LogFile -and (Test-Path -LiteralPath $script:LogFile)){Link 'Открыть журнал настройки' $script:LogFile}
      if($script:LastTask -eq 'Prepare'){Link 'Скачать Node.js LTS ↗' 'https://nodejs.org/'}
      $next.Content='Повторить попытку';$script:NextAction={Start-Work $script:LastTask}
      $script:BackAction={if($script:LastTask -eq 'Prepare'){Set-Stage 'Welcome'}elseif($script:LastTask -eq 'Manual'){Set-Stage 'Manual'}else{$script:Consent=$false;Set-Stage 'Method'}}
    }
    'Ready'{
      Heading 'ГОТОВО К ПЕРВОМУ ЗАПУСКУ' 'Создадим первую схему?' 'В Салфетке уже будет пример текста. Попробуйте на нём — или вставьте свой.'
      Hint "1. Вставьте короткий текст или список.`n2. Нажмите «Визуализировать».`n3. Выберите оформление и скачайте картинку."
      if($script:Mode -eq 'cloud'){Add-Text 'При открытии подключите OpenRouter: вставьте ключ в окно «Нейросеть» и нажмите «Проверить ключ».' 14 '#17283B'}
      if($script:CompletionDetail){Add-Text $script:CompletionDetail 13}
      Add-Text 'В следующий раз откройте ярлык «Салфетка». Программа работает в браузере — это нормально. Окно запуска можно свернуть; пока вы работаете, не закрывайте его.' 14
      $next.Content='Открыть Салфетку →';$back.Content='Закрыть';$script:BackAction={$window.Close()};$footer.Text='Хорошего первого результата'
      $script:NextAction={if($Preview){[Windows.MessageBox]::Show('Это предпросмотр. Настоящая Салфетка не запускается.','Салфетка')|Out-Null}else{Start-Process -FilePath (Join-Path $AppDir 'start.bat') -WorkingDirectory $AppDir;$window.Close()}}
    }
  }
  if($script:Stage -ne 'Ready' -and $script:Stage -ne 'Working'){$back.Content='Назад'}
}
function Update-Slide {
  $titles=@('Из текста — в понятную схему','Оформите по своему вкусу','Сохраните и используйте')
  $details=@('Начните с абзаца или списка на 3–8 пунктов. Салфетка предложит форму, а вы сможете поправить результат.','Выберите стиль, цвета и шрифт. Нажмите на пункт схемы, чтобы изменить его текст или значок.','Скачайте PNG для документа или презентации. PNG без фона удобно размещать поверх слайда; SVG подойдёт для дальнейшей работы.')
  $script:Showcase.Text=$titles[$script:Slide];$script:ShowcaseDetail.Text=$details[$script:Slide]
}
$next.Add_Click({try{& $script:NextAction}catch{$script:Busy=$false;$script:ErrorDetail=$_.Exception.Message;Set-Stage 'Error'}})
$back.Add_Click({& $script:BackAction})
$timer=[Windows.Threading.DispatcherTimer]::new();$timer.Interval=[TimeSpan]::FromMilliseconds(600)
$timer.Add_Tick({
  if(!$script:Busy -or !$script:StatusFile){return}
  $s=$null
  try {
    if(Test-Path -LiteralPath $script:StatusFile){
      $s=[IO.File]::ReadAllText($script:StatusFile)|ConvertFrom-Json
      $script:StatusText.Text=$s.message;$script:DetailText.Text=$s.detail;$script:LogFile=$s.log
      if($s.state -eq 'error'){$script:Busy=$false;$script:ErrorDetail=$s.detail;Set-Stage 'Error'}
      elseif($s.state -eq 'done'){$script:Busy=$false;if($script:LastTask -eq 'Prepare'){$script:AfterPrepare=$true;Set-Stage 'Mode'}else{$script:CompletionDetail=$s.detail;Set-Stage 'Ready'}}
    }
    if($script:Busy -and $script:Worker -and $script:Worker.HasExited){
      # Let the next timer tick consume the final JSON written just before exit.
      if(!$s -or $s.state -eq 'working'){$script:Busy=$false;$script:ErrorDetail='Процесс настройки завершился без результата. Повторите попытку; если ошибка повторится, откройте журнал.';Set-Stage 'Error'}
    }
  }catch{<# A partially-written status file will be retried on the next tick. #>}
})
$window.Add_Closing({param($sender,$e) if($script:Busy){$e.Cancel=$true;[Windows.MessageBox]::Show('Настройка ещё выполняется. Дождитесь завершения текущей операции.','Салфетка')|Out-Null}})
try {
  if($CaptureDir){
    if(!$Preview){throw 'Capture mode requires Preview.'}
    New-Item -ItemType Directory -Force -Path $CaptureDir|Out-Null
    $scene=$window.Content;$window.Content=$null;$scene.Background='White';$scene.Resources=$window.Resources
    foreach($stageName in @('Welcome','Mode','Method','Consent','Manual','Working','Ready','Error')){
      $script:Mode='local';$script:Method='auto';$script:Consent=$false;$script:ErrorDetail='LM Studio не отвечает. Откройте программу и включите сервер во вкладке Developer.'
      Set-Stage $stageName
      if($stageName -eq 'Consent'){
        if($next.IsEnabled){throw 'Consent gate failed: button enabled without agreement.'}
        $script:ConsentBox.IsChecked=$true
        if(!$next.IsEnabled -or !$script:Consent){throw 'Consent gate failed: checkbox does not enable action.'}
        $script:ConsentBox.IsChecked=$false
        if($next.IsEnabled){throw 'Consent gate failed: unchecked agreement still enables action.'}
      }
      $scene.Measure([Windows.Size]::new(824,720));$scene.Arrange([Windows.Rect]::new(0,0,824,720));$scene.UpdateLayout()
      $bitmap=[Windows.Media.Imaging.RenderTargetBitmap]::new(824,720,96,96,[Windows.Media.PixelFormats]::Pbgra32);$bitmap.Render($scene)
      $encoder=[Windows.Media.Imaging.PngBitmapEncoder]::new();$encoder.Frames.Add([Windows.Media.Imaging.BitmapFrame]::Create($bitmap))
      $stream=[IO.File]::Create((Join-Path $CaptureDir ($stageName+'.png')));try{$encoder.Save($stream)}finally{$stream.Dispose()}
    }
    [IO.File]::WriteAllText((Join-Path $CaptureDir 'result.txt'),'8 screens rendered; explicit-consent checkbox gates verified; no installation or download executed.')
  }else{Render;$timer.Start();$window.ShowDialog()|Out-Null}
}finally{$timer.Stop();if($script:Lock){$script:Lock.Dispose()}}
