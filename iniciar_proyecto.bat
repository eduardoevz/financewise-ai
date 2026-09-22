@echo off
title Servidor Finanzas1 Project
echo ========================================================
echo   Iniciando el servidor de Finanzas1 Project...
echo   Disponible en: http://localhost:3000
echo ========================================================
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%LOCALAPPDATA%\Microsoft\WinGet\Packages\Schniz.fnm_Microsoft.Winget.Source_8wekyb3d8bbwe\fnm.exe' env --use-on-cd | Out-String | Invoke-Expression; npm.cmd run dev"
pause
