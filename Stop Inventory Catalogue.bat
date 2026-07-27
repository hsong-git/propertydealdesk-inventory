@echo off
setlocal
title PropertyDealDesk Inventory Catalogue - Stop
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-local.ps1"
set "SCRIPT_EXIT=%ERRORLEVEL%"
if /I not "%~1"=="--no-pause" pause
exit /b %SCRIPT_EXIT%
