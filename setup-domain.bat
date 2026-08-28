@echo off
title ASKsofaworks Domain Setup Wizard
echo ====================================================
echo             ASKsofaworks Domain Setup Wizard
echo ====================================================
echo.

:: Check for administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [1/2] Administrator privileges successfully verified.
    echo [2/2] Registering asksofaworks.local domain mapping...
    
    :: Append mapping to hosts file
    powershell -Command "Add-Content -Path C:\Windows\System32\drivers\etc\hosts -Value '`n127.0.0.1 asksofaworks.local' -ErrorAction Stop"
    
    echo.
    echo ====================================================
    echo SUCCESS: asksofaworks.local is now connected!
    echo ====================================================
    echo.
    echo Opening your browser to: http://asksofaworks.local/
    start http://asksofaworks.local/
    echo.
    pause
) else (
    echo [UAC] Requesting Administrator privileges to write to system hosts file...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
)
