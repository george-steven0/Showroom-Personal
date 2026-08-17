<#
  .SYNOPSIS
    Installs the Showroom backend (which also serves the built frontend,
    see app.module.ts's ServeStaticModule) as a genuine Windows service
    via NSSM, so it starts automatically on boot with no visible window
    and no one needing to be logged in.

  .DESCRIPTION
    Run this ONCE, from an elevated ("Run as Administrator") PowerShell
    window. Installing a Windows service requires Administrator rights
    that a normal session doesn't have. Safe to re-run: it removes any
    existing service of the same name first.

    Deliberately does NOT use port 80 (that's reserved territory on a
    shared PC — IIS, Skype, other local services). Defaults to port 5000
    instead, written into backend\.env so every future restart (a reboot,
    a crash-restart) keeps using it rather than re-picking one. Also adds
    a friendly hostname ("elostaz-showroom.local" by default) to the
    Windows hosts file pointing at this PC, so the app is reachable at
    http://elostaz-showroom.local:5000 instead of a bare port number.
    See -Port, -HostName, -NoHostName below.

    Assumes:
      - node.exe is on PATH (checked below)
      - nssm.exe sits at the project root, next to frontend\ and backend\
        (see -NssmPath to override)
      - `npm run build` has already been run in both frontend/ and
        backend/ (dist/ exists in both) and migrations are applied.
        This script does not build anything, only wires up the service.

  .EXAMPLE
    Right-click this file -> "Run with PowerShell" as Administrator, or:
    powershell -ExecutionPolicy Bypass -File install-service.ps1
    powershell -ExecutionPolicy Bypass -File install-service.ps1 -Port 5050 -HostName 'showroom.local'
#>
param(
    # Defaults to nssm.exe sitting next to frontend\/backend\ at the
    # project root (two levels up from this script, which lives at
    # backend\deploy\) — kept there deliberately, so copying the whole
    # project folder to another PC brings NSSM along with it and this
    # script needs no editing. Pass -NssmPath to point somewhere else.
    [string]$NssmPath = (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'nssm.exe'),
    [string]$ServiceName = 'ShowroomManagement',
    # The port the deployed service listens on — deliberately NOT 80 (see
    # the file-level note) and NOT 3000 (the frontend dev server's own
    # default target, so a dev session and the installed service can run
    # side by side without colliding).
    [int]$Port = 5000,
    # A friendly name added to the Windows hosts file pointing at this PC
    # (http://elostaz-showroom.local:5000 instead of a bare port number).
    # Pass -NoHostName to skip this (an empty -HostName '' does NOT work
    # here — PowerShell's -File argument passing silently drops
    # empty-string arguments before this script ever sees them, so a real
    # switch is used instead).
    [string]$HostName = 'elostaz-showroom.local',
    [switch]$NoHostName
)

if ($NoHostName) { $HostName = '' }

# Deliberately NOT 'Stop': nssm.exe (a native, non-PowerShell program)
# writes routine status text to stderr, and under $ErrorActionPreference
# = 'Stop' PowerShell 5.1 treats any stderr line from a native command
# as a terminating error, regardless of the exe's actual exit code or
# where that stream is redirected. Every nssm.exe call below is checked
# by its own $LASTEXITCODE where it actually matters instead.
$ErrorActionPreference = 'Continue'

function Invoke-Nssm {
    param([Parameter(ValueFromRemainingArguments)][string[]]$NssmArgs)
    & $NssmPath @NssmArgs *> $null
    return $LASTEXITCODE
}

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host 'This script must be run as Administrator (right-click -> Run as Administrator).' -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $NssmPath)) {
    Write-Host "nssm.exe not found at $NssmPath. Pass -NssmPath if you installed it elsewhere." -ForegroundColor Red
    exit 1
}

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
    Write-Host 'node.exe was not found on PATH.' -ForegroundColor Red
    exit 1
}

# This script lives at backend\deploy\install-service.ps1, so the
# backend root is one level up, resolved from the script's own
# location, not the caller's working directory.
$backend = Split-Path -Parent $PSScriptRoot
$mainJs = Join-Path $backend 'dist\main.js'
if (-not (Test-Path $mainJs)) {
    Write-Host "dist\main.js not found at $mainJs. Run 'npm run build' in backend\ first." -ForegroundColor Red
    exit 1
}

$logDir = Join-Path $backend 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

Write-Host "Backend root: $backend"
Write-Host "node.exe:     $node"
Write-Host "nssm.exe:     $NssmPath"
Write-Host "Service name: $ServiceName"
Write-Host "Port:         $Port"
Write-Host ''

# Best-effort: point a friendly hostname at this PC so end users don't
# have to remember a port number. Marked with a comment so
# uninstall-service.ps1 (and re-runs of this script) can find and
# replace exactly this line later. Re-running with the same -HostName is
# a no-op; a different one swaps the old marked line for the new one;
# -NoHostName removes it entirely. Never fatal — if the hosts file can't
# be written (locked, blocked by antivirus, etc.) the service still
# installs fine and localhost still works.
$hostsEntryOk = $false
$hostsFile = Join-Path $env:WINDIR 'System32\drivers\etc\hosts'
$marker = "# $ServiceName"
try {
    # @() forces an array even when Get-Content/Where-Object return a
    # single line — without it, PowerShell unwraps a one-item result to
    # a bare string, and "$kept + $currentLine" below would silently do
    # string concatenation (merging two hosts entries onto one corrupt,
    # unparseable line) instead of appending a new array element.
    $existingLines = @(Get-Content -Path $hostsFile -ErrorAction Stop)
    $kept = @($existingLines | Where-Object { $_ -notmatch [regex]::Escape($marker) })
    if ($HostName) {
        $currentLine = "127.0.0.1`t$HostName`t$marker"
        if ($existingLines -contains $currentLine) {
            $hostsEntryOk = $true
        }
        else {
            Set-Content -Path $hostsFile -Value ($kept + $currentLine) -ErrorAction Stop
            Write-Host "Added '$HostName' to the hosts file." -ForegroundColor Green
            $hostsEntryOk = $true
        }
    }
    elseif ($kept.Count -ne $existingLines.Count) {
        Set-Content -Path $hostsFile -Value $kept -ErrorAction Stop
        Write-Host 'Removed the previous hosts file entry (no -HostName given this time).' -ForegroundColor Green
    }
}
catch {
    Write-Host "Could not update the hosts file ($($_.Exception.Message)) - skipping, localhost will still work." -ForegroundColor Yellow
}

# Best-effort cleanup of a previous install (including a partial one
# left behind by a run that wasn't elevated) — failure here is
# expected and fine; what matters is the fresh install below.
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Removing existing '$ServiceName' service first..."
    Invoke-Nssm stop $ServiceName confirm | Out-Null
    Start-Sleep -Seconds 2
    Invoke-Nssm remove $ServiceName confirm | Out-Null
    Start-Sleep -Seconds 1
}

# Catch a busy port before installing rather than after: without this, a
# port already owned by something else would make the service crash-loop
# forever on every restart attempt instead of failing once, clearly,
# right here. Falls back to the first free port in 5001-5010 if $Port is
# taken. The choice (whichever it ends up being) is written into
# backend\.env, not just used for this one run, so a reboot or
# crash-restart keeps using the same address instead of silently
# changing whatever someone may have already bookmarked.
$envFile = Join-Path $backend '.env'
$portOwner = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($portOwner) {
    $originalPort = $Port
    $ownerName = (Get-Process -Id $portOwner.OwningProcess -ErrorAction SilentlyContinue).ProcessName
    Write-Host "Port $originalPort is already in use by another program (PID $($portOwner.OwningProcess), $ownerName)." -ForegroundColor Yellow

    $fallback = (($originalPort + 1)..($originalPort + 10)) | Where-Object {
        -not (Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue)
    } | Select-Object -First 1

    if (-not $fallback) {
        Write-Host "No free fallback port in $($originalPort + 1)-$($originalPort + 10) either." -ForegroundColor Red
        Write-Host "Free up a port manually, or pass a different -Port yourself, then re-run this script." -ForegroundColor Yellow
        exit 1
    }

    $Port = $fallback
    Write-Host "Using port $Port instead." -ForegroundColor Yellow
}

if (Test-Path $envFile) {
    $envLines = Get-Content -Path $envFile
    if ($envLines -match '^\s*PORT\s*=') {
        $envLines = $envLines -replace '^\s*PORT\s*=.*', "PORT=$Port"
    }
    else {
        $envLines += "PORT=$Port"
    }
    Set-Content -Path $envFile -Value $envLines
}
else {
    Write-Host "backend\.env not found — copy .env.example to .env and fill it in first." -ForegroundColor Red
    exit 1
}
Write-Host "Saved PORT=$Port to backend\.env." -ForegroundColor Green

$installExit = Invoke-Nssm install $ServiceName $node 'dist\main.js'
if ($installExit -ne 0) {
    Write-Host "nssm install failed (exit code $installExit)." -ForegroundColor Red
    exit 1
}

Invoke-Nssm set $ServiceName AppDirectory $backend | Out-Null
Invoke-Nssm set $ServiceName DisplayName 'Showroom Management' | Out-Null
Invoke-Nssm set $ServiceName Description 'Car Showroom Management System - local backend + web app (managed by NSSM, auto-restarts on crash).' | Out-Null
Invoke-Nssm set $ServiceName Start SERVICE_AUTO_START | Out-Null
Invoke-Nssm set $ServiceName AppEnvironmentExtra 'NODE_ENV=production' | Out-Null

# NSSM restarts a crashed process by default (`AppExit Default Restart`
# is already its default behaviour) — this is the whole reason NSSM was
# chosen over Task Scheduler, so it's set explicitly here rather than
# left implicit.
Invoke-Nssm set $ServiceName AppExit Default Restart | Out-Null
Invoke-Nssm set $ServiceName AppRestartDelay 3000 | Out-Null

# Logs rotate daily or past 10MB, whichever comes first, so months of
# uptime on an unattended PC don't grow an unbounded file.
Invoke-Nssm set $ServiceName AppStdout (Join-Path $logDir 'service.log') | Out-Null
Invoke-Nssm set $ServiceName AppStderr (Join-Path $logDir 'service-error.log') | Out-Null
Invoke-Nssm set $ServiceName AppRotateFiles 1 | Out-Null
Invoke-Nssm set $ServiceName AppRotateOnline 1 | Out-Null
Invoke-Nssm set $ServiceName AppRotateSeconds 86400 | Out-Null
Invoke-Nssm set $ServiceName AppRotateBytes 10485760 | Out-Null

$startExit = Invoke-Nssm start $ServiceName
Start-Sleep -Seconds 3

Write-Host ''
Get-Service $ServiceName | Format-List Name, DisplayName, Status, StartType

if ($startExit -ne 0) {
    Write-Host "nssm start returned exit code $startExit - checking whether it's running anyway..." -ForegroundColor Yellow
}

try {
    $health = Invoke-WebRequest -Uri "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "Health check: $($health.StatusCode) $($health.Content)" -ForegroundColor Green
    Write-Host ''
    Write-Host 'Done. The service starts automatically on every boot, before anyone logs in.' -ForegroundColor Green
    Write-Host "Open http://localhost:$Port in a browser to use the system." -ForegroundColor Green
    if ($hostsEntryOk) {
        Write-Host "Or use the easier-to-remember address: http://$HostName`:$Port" -ForegroundColor Green
    }
}
catch {
    Write-Host "Health check failed: $_" -ForegroundColor Red
    Write-Host "Check $logDir\service-error.log for details." -ForegroundColor Yellow
    exit 1
}
