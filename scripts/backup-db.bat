@echo off
REM =====================================
REM PostgreSQL Database Backup Script (Windows)
REM =====================================
REM 
REM Usage: backup-db.bat
REM 
REM This script creates a custom-format backup of the SeikoMMO database
REM with automatic retention (keeps last 30 days)
REM
REM Setup for automated backups:
REM 1. Edit configuration section below
REM 2. Test manually: backup-db.bat
REM 3. Schedule with Task Scheduler (see docs/PROD.md)
REM

SETLOCAL EnableDelayedExpansion

REM =====================================
REM Configuration
REM =====================================
SET DB_NAME=seiko_mmo
SET DB_USER=postgres
SET DB_HOST=localhost
SET DB_PORT=5432
SET BACKUP_DIR=C:\Backups\postgres
SET RETENTION_DAYS=30

REM Get current date/time for filename
FOR /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
SET TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
SET BACKUP_FILE=%BACKUP_DIR%\%DB_NAME%_%TIMESTAMP%.backup

REM =====================================
REM Create backup directory if not exists
REM =====================================
IF NOT EXIST "%BACKUP_DIR%" (
    echo Creating backup directory: %BACKUP_DIR%
    mkdir "%BACKUP_DIR%"
)

REM =====================================
REM Perform backup
REM =====================================
echo =====================================
echo PostgreSQL Backup Script
echo =====================================
echo Database: %DB_NAME%
echo Host: %DB_HOST%:%DB_PORT%
echo User: %DB_USER%
echo Backup file: %BACKUP_FILE%
echo.

REM Check if pg_dump is available
WHERE pg_dump >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: pg_dump not found in PATH!
    echo.
    echo Please install PostgreSQL client tools or add to PATH:
    echo   C:\Program Files\PostgreSQL\16\bin
    echo.
    exit /b 1
)

REM Perform backup (custom format for best compression and restore options)
echo Starting backup...
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% ^
    --format=custom ^
    --no-owner ^
    --no-acl ^
    --file="%BACKUP_FILE%"

IF %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Backup completed successfully
    echo   File: %BACKUP_FILE%
    
    REM Get file size
    FOR %%A in ("%BACKUP_FILE%") do (
        SET size=%%~zA
        SET /A sizeKB=!size! / 1024
        SET /A sizeMB=!sizeKB! / 1024
        echo   Size: !sizeMB! MB
    )
    
    REM =====================================
    REM Cleanup old backups
    REM =====================================
    echo.
    echo Cleaning up backups older than %RETENTION_DAYS% days...
    
    FORFILES /P "%BACKUP_DIR%" /M "%DB_NAME%_*.backup" /D -%RETENTION_DAYS% /C "cmd /c echo Deleting @file && del @path" 2>nul
    
    IF %ERRORLEVEL% EQU 0 (
        echo ✓ Old backups cleaned up
    ) ELSE (
        echo ℹ No old backups to clean up
    )
    
    echo.
    echo =====================================
    echo Backup completed at %date% %time%
    echo =====================================
    
    exit /b 0
) ELSE (
    echo.
    echo ✗ Backup FAILED!
    echo.
    echo Troubleshooting:
    echo   1. Check PostgreSQL is running
    echo   2. Verify DB_USER has backup permissions
    echo   3. Check disk space in %BACKUP_DIR%
    echo   4. Verify database name: %DB_NAME%
    echo.
    echo Set PGPASSWORD environment variable or use .pgpass file
    echo.
    exit /b 1
)

ENDLOCAL
