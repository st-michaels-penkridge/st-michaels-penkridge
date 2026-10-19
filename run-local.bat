@echo off
title St Michael's site - localhost:8000 (close this window to stop)
cd /d "%~dp0"
echo Starting St Michael's site at http://localhost:8000
echo Close this window to stop the server.
echo.
python --version >nul 2>&1 && (python -m http.server 8000 & goto :end)
py --version >nul 2>&1 && (py -m http.server 8000 & goto :end)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve-local.ps1"
:end
pause
