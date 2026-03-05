# TimeTrackPro Desktop

This desktop shell wraps the frontend and exposes desktop-only tracking APIs:
- periodic screenshot capture
- system idle-time checks

## Run

1. Start backend API (`http://localhost:8000`)
2. Start frontend (`http://localhost:5173`)
3. Start desktop app:

```powershell
cd desktop
npm install
npm start
```

By default Electron loads `http://localhost:5173`.
To change URL:

```powershell
$env:APP_URL="http://localhost:4173"
npm start
```

