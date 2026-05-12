@echo off
title BADONE RTO ^& INSURANCE ERP Startup
echo ===================================================
echo   Starting BADONE RTO ^& INSURANCE ERP...
echo   Please wait while the database and servers load.
echo ===================================================
cd /d "%~dp0"

:: Check if node_modules exists, if not run npm install
IF NOT EXIST node_modules\ (
    echo Installing required dependencies for the first time...
    REM We must quote the npm command if running from this folder, but usually npm install is fine
    REM If npm install fails, the user must run it manually from a folder without ^&
    call npm install
)

echo Starting React Frontend Server...
:: Using node directly to bypass NPM/NPX path parsing bugs with '&' in folder names
start "Vite Server" /B node "node_modules\vite\bin\vite.js"

echo Waiting 5 seconds for frontend to compile...
ping 127.0.0.1 -n 6 >nul

echo Starting Electron Desktop App...
set NODE_ENV=development
node "node_modules\electron\cli.js" .

:: When Electron closes, kill the Vite server
taskkill /f /im node.exe /fi "windowtitle eq Vite Server*" >nul 2>&1
exit
