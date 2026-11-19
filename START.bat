@echo off
title MCA Inauguration Server - keep this window open
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed on this PC.
  echo  Install the LTS version from https://nodejs.org and run this file again.
  echo.
  pause
  exit /b
)
if not exist node_modules (
  echo Installing packages - needs internet only this first time...
  call npm install
)
node server.js
pause
