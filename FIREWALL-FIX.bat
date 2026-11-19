@echo off
title Allow MCA Inauguration through Windows Firewall
net session >nul 2>&1
if errorlevel 1 (
  echo Asking for administrator permission...
  powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
netsh advfirewall firewall delete rule name="MCA Inauguration (port 3000)" >nul 2>&1
netsh advfirewall firewall add rule name="MCA Inauguration (port 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any
echo.
echo  Done. The phone can now reach this PC on port 3000 (Private and Public networks).
echo.
pause
