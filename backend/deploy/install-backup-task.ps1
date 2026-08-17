<#
  .SYNOPSIS
    Registers a daily Windows Scheduled Task that backs up the SQLite
    database (see backend\scripts\backup.ts).

  .DESCRIPTION
    Run this ONCE, from an elevated ("Run as Administrator") PowerShell
    window - a task that runs whether anyone is logged in or not needs
    Administrator rights to register, same reason install-service.ps1
    does. Safe to re-run: it replaces any existing task of the same
    name first.

    The task runs as SYSTEM (no password to store or expire) and calls
    "npm run backup" with backend\ as its working directory. That script
    checkpoints the WAL, copies the live .db file into BACKUP_DIR with a
    timestamped "backup-*" name, and prunes anything past the most
    recent 30.

  .EXAMPLE
    Right-click this file -> "Run with PowerShell" as Administrator, or:
    powershell -ExecutionPolicy Bypass -File install-backup-task.ps1
    powershell -ExecutionPolicy Bypass -File install-backup-task.ps1 -Time '02:30'
#>
param(
  [string]$TaskName = 'ShowroomDatabaseBackup',
  # 24-hour HH:mm. 03:00 is a reasonable default for a showroom that
  # isn't open then, but pass whatever suits this installation.
  [string]$Time = '03:00'
)

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host 'This script must be run as Administrator (right-click -> Run as Administrator).' -ForegroundColor Red
    exit 1
}

# Accepts both zero-padded ('03:00') and plain ('3:00') hours. The
# [string[]] cast on the formats array is required - PowerShell's own
# array literal doesn't reliably bind to this overload without it, and
# silently returns false (not an error) when it doesn't.
$parsedTime = [datetime]::MinValue
$timeOk = [datetime]::TryParseExact(
    $Time, [string[]]@('HH:mm', 'H:mm'), [System.Globalization.CultureInfo]::InvariantCulture,
    [System.Globalization.DateTimeStyles]::None, [ref]$parsedTime)
if (-not $timeOk) {
    Write-Host "-Time must be 24-hour HH:mm, e.g. '03:00' or '14:30' - got '$Time'." -ForegroundColor Red
    exit 1
}

Import-Module ScheduledTasks -ErrorAction Stop

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
    Write-Host 'node.exe was not found on PATH.' -ForegroundColor Red
    exit 1
}

# Not "Get-Command npm" - that typically resolves to npm.ps1, a
# PowerShell script Task Scheduler's launcher cannot directly execute.
# npm.cmd sits next to node.exe in every normal Node.js install.
$npmCmd = Join-Path (Split-Path -Parent $node) 'npm.cmd'
if (-not (Test-Path $npmCmd)) {
    Write-Host "npm.cmd not found at $npmCmd (expected next to node.exe)." -ForegroundColor Red
    exit 1
}

# This script lives at backend\deploy\install-backup-task.ps1.
$backend = Split-Path -Parent $PSScriptRoot
$packageJson = Join-Path $backend 'package.json'
if (-not (Test-Path $packageJson)) {
    Write-Host "package.json not found at $backend - is this script still inside backend\deploy?" -ForegroundColor Red
    exit 1
}

Write-Host "Backend root: $backend"
Write-Host "npm.cmd:      $npmCmd"
Write-Host "Task name:    $TaskName"
Write-Host "Runs daily:   $Time"
Write-Host ''

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction -Execute $npmCmd -Argument 'run backup' -WorkingDirectory $backend
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
# ServiceAccount + SYSTEM: no password to supply, expire, or rotate -
# same account NSSM runs the web service as by default.
$taskPrincipal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 15)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $taskPrincipal -Settings $settings -Description 'Daily database backup for the Showroom app - see backend\scripts\backup.ts.' | Out-Null

Write-Host "Registered '$TaskName' to run daily at $Time." -ForegroundColor Green
Write-Host "Check it any time in Task Scheduler (taskschd.msc), or with:"
Write-Host "    Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo"
Write-Host ''

Write-Host 'Running it once now to confirm it actually works end to end...'
Start-ScheduledTask -TaskName $TaskName
$deadline = (Get-Date).AddSeconds(30)
do {
    Start-Sleep -Seconds 1
    $state = (Get-ScheduledTask -TaskName $TaskName).State
} while ($state -eq 'Running' -and (Get-Date) -lt $deadline)

$info = Get-ScheduledTaskInfo -TaskName $TaskName
if ($info.LastTaskResult -eq 0) {
    Write-Host "Success - check backend\backups for a new file with today's date." -ForegroundColor Green
} else {
    Write-Host "The test run finished with result code $($info.LastTaskResult) (0 is success)." -ForegroundColor Yellow
    Write-Host 'That does not necessarily mean the task itself is broken - check backend\backups for a new file, and if one is missing, run "npm run backup" by hand in backend\ to see the actual error.' -ForegroundColor Yellow
}
