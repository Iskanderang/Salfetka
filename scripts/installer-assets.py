"""Build Inno's bitmap resources from the existing Salfetka logo, without replacing it."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
out = root / 'installer' / 'assets'
out.mkdir(exist_ok=True)
source = Image.open(root / 'apps/web/public/brand/logo.png').convert('RGBA')

def font(size, bold=False):
    return ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf', size)

canvas = Image.new('RGB', (328, 628), '#f1f7fd')
logo = source.copy()
logo.thumbnail((264, 232), Image.Resampling.LANCZOS)
canvas.paste(logo, ((328-logo.width)//2, 54), logo)
draw = ImageDraw.Draw(canvas)
draw.text((34, 308), 'Салфетка', fill='#17283b', font=font(38, True))
draw.text((36, 369), 'Ваши идеи —', fill='#526d86', font=font(22))
draw.text((36, 403), 'в понятных схемах', fill='#526d86', font=font(22))
for y, label in [(490, 'Вставьте текст'), (530, 'Выберите оформление'), (570, 'Сохраните картинку')]:
    draw.ellipse((36, y+8, 44, y+16), fill='#258de8')
    draw.text((58, y), label, fill='#526d86', font=font(18))
canvas.save(out / 'wizard.bmp')
small = Image.new('RGB', (110, 110), 'white')
logo = source.copy()
logo.thumbnail((104, 100), Image.Resampling.LANCZOS)
small.paste(logo, ((110-logo.width)//2, (110-logo.height)//2), logo)
small.save(out / 'wizard-small.bmp')
print('Installer branding: existing apps/web/public/brand/logo.png')
