@echo off
cd /d "%~dp0"
echo === PaySafe Next.js setup ===
node scripts\setup-next.mjs
if errorlevel 1 exit /b 1
echo.
echo === Installation npm ===
call npm install
if errorlevel 1 exit /b 1
echo.
echo OK. Lancez: npm run dev
pause
