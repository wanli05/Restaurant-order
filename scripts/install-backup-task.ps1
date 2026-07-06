param(
  [string]$ProjectRoot = "C:\Users\Yang\Desktop\Restaurant-order",
  [string]$TaskName = "RestaurantOrder-DB-Backup",
  [int]$IntervalMinutes = 10
)

$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $ProjectRoot "scripts\backup-db.ps1"
if (!(Test-Path $scriptPath)) {
  throw "备份脚本不存在: $scriptPath"
}

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -ProjectRoot `"$ProjectRoot`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Backup Restaurant order SQLite database periodically." | Out-Null

Write-Host "Scheduled task installed: $TaskName (every $IntervalMinutes minutes)"
