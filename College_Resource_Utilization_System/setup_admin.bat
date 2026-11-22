@echo off
echo =======================================================
echo    COLLEGE RESOURCE ALLOCATION - ADMIN SETUP TOOL
echo =======================================================
cd "%~dp0backend"
python seed_admin.py
pause
