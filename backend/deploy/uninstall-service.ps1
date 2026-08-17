<#
  .SYNOPSIS
    Removes the ShowroomManagement Windows service installed by
    install-service.ps1. Run as Administrator. Does not touch the
    database, backups, or any application files - only the service
    registration itself (and the hosts file entry install-service.ps1
    added, if any).
#>
param(
  # Defaults to nssm.exe at the project root - see install-service.ps1's
  # matching comment for why.
  [string]$NssmPath = (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'nssm.exe'),
  # Must match whatever -ServiceName install-service.ps1 was run with.
  [string]$ServiceName = 'ShowroomManagement',
  # Removal below is marker-based, not name-based, so this doesn't need
  # to match whatever name was actually in use - it only controls
  # whether the hosts file cleanup runs at all. Pass -NoHostName to
  # leave the hosts file untouched (an empty -HostName '' does NOT
  # work here - see install-service.ps1's matching comment for why).
  [string]$HostName = 'elostaz-showroom.local',
  [switch]$NoHostName
)

if ($NoHostName) { $HostName = '' }

# Deliberately NOT 'Stop' - see install-service.ps1's comment on the
# same line: nssm.exe's routine stderr chatter would otherwise abort
# this script under PowerShell 5.1's native-command error handling.
$ErrorActionPreference = 'Continue'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host 'This script must be run as Administrator (right-click -> Run as Administrator).' -ForegroundColor Red
    exit 1
}

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $existing) {
    Write-Host "No '$ServiceName' service found. Nothing to remove."
    exit 0
}

& $NssmPath stop $ServiceName confirm *> $null
Start-Sleep -Seconds 2
& $NssmPath remove $ServiceName confirm *> $null

$stillThere = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($stillThere) {
    Write-Host "Service still present after removal attempt - check manually with 'services.msc'." -ForegroundColor Yellow
} else {
    Write-Host "Removed the '$ServiceName' service." -ForegroundColor Green
}

# Best-effort: undo the hosts file line install-service.ps1 added,
# identified by its trailing comment marker so unrelated hosts entries
# are never touched. Not fatal if this fails or there's nothing there.
if ($HostName) {
    $hostsFile = Join-Path $env:WINDIR 'System32\drivers\etc\hosts'
    $marker = "# $ServiceName"
    try {
        $lines = @(Get-Content -Path $hostsFile -ErrorAction Stop)
        $kept = @($lines | Where-Object { $_ -notmatch [regex]::Escape($marker) })
        if ($kept.Count -ne $lines.Count) {
            Set-Content -Path $hostsFile -Value $kept -ErrorAction Stop
            Write-Host "Removed the '$HostName' hosts file entry." -ForegroundColor Green
        }
    } catch {
        Write-Host "Could not clean up the '$HostName' hosts file entry ($($_.Exception.Message))." -ForegroundColor Yellow
    }
}
