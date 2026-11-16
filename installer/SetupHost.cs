using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Management.Automation;
using System.Management.Automation.Runspaces;
using System.Threading;
using System.Windows.Forms;
using System.Diagnostics;

internal static class SetupHost {
    [STAThread]
    private static void Main(string[] args) {
        var appDir = Directory.GetParent(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)).FullName;
        try {
            if (args.Any(a => String.Equals(a, "/launch", StringComparison.OrdinalIgnoreCase)) && File.Exists(Path.Combine(appDir, ".first-run-done"))) {
                Process.Start(new ProcessStartInfo { FileName = Path.Combine(appDir, "start.bat"), WorkingDirectory = appDir, UseShellExecute = true });
                return;
            }
            using (var runspace = RunspaceFactory.CreateRunspace()) {
                runspace.ApartmentState = ApartmentState.STA;
                runspace.ThreadOptions = PSThreadOptions.UseCurrentThread;
                runspace.Open();
                using (var ps = PowerShell.Create()) {
                    ps.Runspace = runspace;
                    ps.AddCommand("Set-ExecutionPolicy").AddParameter("Scope", "Process").AddParameter("ExecutionPolicy", "Bypass").AddParameter("Force");
                    ps.Invoke();
                    ps.Commands.Clear();
                    ps.Streams.Error.Clear();
                    ps.AddCommand(Path.Combine(appDir, "installer", "setup-wizard.ps1"));
                    ps.AddParameter("AppDir", appDir);
                    if (args.Any(a => String.Equals(a, "/preview", StringComparison.OrdinalIgnoreCase))) ps.AddParameter("Preview");
                    var capture = args.FirstOrDefault(a => a.StartsWith("/qa=", StringComparison.OrdinalIgnoreCase));
                    if (capture != null) { ps.AddParameter("Preview"); ps.AddParameter("CaptureDir", capture.Substring(4)); }
                    ps.Invoke();
                    if (ps.HadErrors) throw new InvalidOperationException(String.Join(Environment.NewLine, ps.Streams.Error.Select(e => e.ToString())));
                }
            }
        } catch (Exception ex) {
            MessageBox.Show("Не удалось открыть мастер настройки.\n\n" + ex.Message + "\n\nПовторите запуск или обратитесь за помощью к автору.", "Салфетка", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}
