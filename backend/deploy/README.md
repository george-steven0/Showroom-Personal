# Deploying Showroom as a Windows service

Runs the backend (which also serves the built frontend — see
`app.module.ts`'s `ServeStaticModule`) as a background Windows service via
[NSSM](https://nssm.cc/), so it starts automatically on boot, restarts
itself if it ever crashes, and needs no one logged in or any window left
open.

Not port 80 — that's often already claimed by something else on a shared
PC. The service listens on **5000** by default, and the app is reachable
at **http://elostaz-showroom.local:5000** once installed (a hosts-file
entry is added automatically, alongside the always-working
`http://localhost:5000`).

## One-time setup

From the project root:

```powershell
cd frontend
npm install
npm run build          # produces frontend/dist

cd ..\backend
npm install
copy .env.example .env # then edit JWT_SECRET and the admin credentials
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run build           # produces backend/dist
```

Then, from an **elevated** ("Run as Administrator") PowerShell window:

```powershell
cd backend\deploy
powershell -ExecutionPolicy Bypass -File install-service.ps1
```

This installs and starts the `ShowroomManagement` service, writes
`PORT=5000` into `backend\.env` (falling back to 5001–5010 if 5000 is
somehow already taken), adds `elostaz-showroom.local` to the Windows
hosts file, and runs a health check to confirm it actually came up.

Optional — a daily database backup, same idea as the web service:

```powershell
powershell -ExecutionPolicy Bypass -File install-backup-task.ps1
```

Registers a Scheduled Task (default: 03:00 daily) that runs
`npm run backup` — checkpoints the database, copies it into
`backend\backups\` with a timestamp, and prunes anything past the most
recent 30.

## Updating after a code change

```powershell
cd frontend && npm run build
cd ..\backend && npm run build
```

Then either reboot, or restart just the service:

```powershell
Restart-Service ShowroomManagement
```

## Removing

```powershell
cd backend\deploy
powershell -ExecutionPolicy Bypass -File uninstall-service.ps1
powershell -ExecutionPolicy Bypass -File uninstall-backup-task.ps1   # if installed
```

Neither script touches the database, backups, or any application files —
only the service/task registration and the hosts file entry.

## Customizing

Both install scripts take parameters — e.g. a different port or hostname:

```powershell
powershell -ExecutionPolicy Bypass -File install-service.ps1 -Port 5050 -HostName 'showroom.local'
powershell -ExecutionPolicy Bypass -File install-service.ps1 -NoHostName   # skip the hosts file entirely
```
