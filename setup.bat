@echo off
echo ========================================
echo Seiko MMO - Quick Setup Script
echo ========================================
echo.

echo [1/6] Checking pnpm installation...
where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo pnpm not found. Installing pnpm...
    call npm install -g pnpm
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install pnpm. Please install manually: npm install -g pnpm
        pause
        exit /b 1
    )
) else (
    echo pnpm is already installed
)
echo.

echo [2/6] Installing dependencies...
call pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install dependencies
    pause
    exit /b 1
)
echo.

echo [3/6] Checking Docker...
docker --version >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Docker is not installed or not running
    echo Please install Docker Desktop and start it
    pause
    exit /b 1
)
echo.

echo [4/6] Starting Docker services...
call docker-compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo Failed to start Docker services
    pause
    exit /b 1
)
echo Waiting for services to be healthy...
timeout /t 10 /nobreak >nul
echo.

echo [5/6] Setting up environment files...
if not exist apps\web\.env.local (
    copy apps\web\.env.example apps\web\.env.local
    echo Created apps/web/.env.local
)
if not exist apps\api\.env (
    copy apps\api\.env.example apps\api\.env
    echo Created apps/api/.env
)
echo.

echo [6/6] Setting up Prisma...
cd apps\api
call pnpm prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo Failed to generate Prisma Client
    cd ..\..
    pause
    exit /b 1
)
call pnpm prisma db push
if %ERRORLEVEL% NEQ 0 (
    echo Warning: Failed to push database schema
    echo Make sure PostgreSQL is running in Docker
)
cd ..\..
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Run: pnpm dev
echo 2. Open: http://localhost:3000 (Web)
echo 3. Open: http://localhost:3001/health (API)
echo.
echo Services status:
call docker-compose ps
echo.
pause
