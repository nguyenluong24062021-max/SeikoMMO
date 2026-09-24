@echo off
REM restart-all.bat - Khởi động tất cả services cho SeikoMMO Platform
REM Author: ROO-07 Task Implementation
REM Date: 2026-09-22

setlocal enabledelayedexpansion

echo ========================================
echo   SeikoMMO Platform - Restart All
echo ========================================
echo.

REM Set log directory
set LOG_DIR=%TEMP%\opencode
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [1/3] Starting PostgreSQL Portable...
set PG_LOG=%LOG_DIR%\postgres.log
echo Log: %PG_LOG%

REM Start PostgreSQL portable (installed at %LOCALAPPDATA%\SeikoPGSQL)
set PG_BIN=%LOCALAPPDATA%\SeikoPGSQL\pgsql\bin
set PG_DATA=%LOCALAPPDATA%\SeikoPGSQL\data

if not exist "%PG_BIN%\pg_ctl.exe" (
    echo ERROR: PostgreSQL not found at %PG_BIN%
    echo Please adjust PG_DIR in restart-all.bat
    pause
    exit /b 1
)

start "PostgreSQL" /MIN cmd /c "%PG_BIN%\pg_ctl.exe -D %PG_DATA% -l %PG_LOG% start > nul 2>&1"
timeout /t 3 /nobreak >nul
echo PostgreSQL started (check %PG_LOG% for details)
echo.

echo [2/3] Starting NestJS API (port 3001)...
set API_LOG=%LOG_DIR%\api.log
echo Log: %API_LOG%

cd apps\api
if not exist "dist\main.js" (
    echo ERROR: API not built. Run 'npm run build' first.
    cd ..\..
    pause
    exit /b 1
)

start "API Server" /MIN cmd /c "node dist\main.js > %API_LOG% 2>&1"
cd ..\..
timeout /t 2 /nobreak >nul
echo API server started on http://localhost:3001
echo.

echo [3/3] Starting Next.js Web (port 3000)...
set WEB_LOG=%LOG_DIR%\web.log
echo Log: %WEB_LOG%

cd apps\web
if not exist ".next" (
    echo WARNING: Next.js not built. Starting in dev mode...
    start "Web Server" /MIN cmd /c "npm run dev > %WEB_LOG% 2>&1"
) else (
    start "Web Server" /MIN cmd /c "npm run start > %WEB_LOG% 2>&1"
)
cd ..\..
timeout /t 2 /nobreak >nul
echo Web app started on http://localhost:3000
echo.

echo ========================================
echo   All services started!
echo ========================================
echo.
echo Services:
echo   - PostgreSQL: Running (log: %PG_LOG%)
echo   - API:        http://localhost:3001 (log: %API_LOG%)
echo   - Web:        http://localhost:3000 (log: %WEB_LOG%)
echo.
echo Press any key to open logs folder...
pause >nul
explorer "%LOG_DIR%"
