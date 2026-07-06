param(
  [string]$ProjectRoot = "C:\Users\Yang\Desktop\Restaurant-order",
  [int]$KeepDays = 14
)

$ErrorActionPreference = "Stop"

$dbPath = Join-Path $ProjectRoot "orders.db"
$backupDir = Join-Path $ProjectRoot "backups"
if (!(Test-Path $dbPath)) {
  throw "数据库文件不存在: $dbPath"
}

New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $backupDir "orders-$stamp.db"

Copy-Item -Path $dbPath -Destination $backupFile -Force

$cutoff = (Get-Date).AddDays(-1 * [Math]::Abs($KeepDays))
Get-ChildItem -Path $backupDir -File -Filter "orders-*.db" |
  Where-Object { $_.LastWriteTime -lt $cutoff } |
  Remove-Item -Force

Write-Host "Backup created: $backupFile"
