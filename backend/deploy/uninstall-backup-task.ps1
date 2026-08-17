<#
  .SYNOPSIS
    Removes the daily backup Scheduled Task installed by
    install-backup-task.ps1. Run as Administrator. Does not touch the
    database or any files already inside backend\backups — only the
    task registration itself.
#>
param(
  [string]$TaskName = 'ShowroomDatabaseBackup'
)

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host 'This script must be run as Administrator (right-click -> Run as Administrator).' -ForegroundColor Red
    exit 1
}

Import-Module ScheduledTasks -ErrorAction Stop

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $existing) {
    Write-Host "No '$TaskName' scheduled task found. Nothing to remove."
    exit 0
}

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "Removed the '$TaskName' scheduled task." -ForegroundColor Green
