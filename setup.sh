#!/bin/bash

echo "========================================"
echo "Seiko MMO - Quick Setup Script"
echo "========================================"
echo ""

echo "[1/6] Checking pnpm installation..."
if ! command -v pnpm &> /dev/null; then
    echo "pnpm not found. Installing pnpm..."
    npm install -g pnpm
    if [ $? -ne 0 ]; then
        echo "Failed to install pnpm. Please install manually: npm install -g pnpm"
        exit 1
    fi
else
    echo "pnpm is already installed"
fi
echo ""

echo "[2/6] Installing dependencies..."
pnpm install
if [ $? -ne 0 ]; then
    echo "Failed to install dependencies"
    exit 1
fi
echo ""

echo "[3/6] Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed or not running"
    echo "Please install Docker Desktop and start it"
    exit 1
fi
echo ""

echo "[4/6] Starting Docker services..."
docker-compose up -d
if [ $? -ne 0 ]; then
    echo "Failed to start Docker services"
    exit 1
fi
echo "Waiting for services to be healthy..."
sleep 10
echo ""

echo "[5/6] Setting up environment files..."
if [ ! -f apps/web/.env.local ]; then
    cp apps/web/.env.example apps/web/.env.local
    echo "Created apps/web/.env.local"
fi
if [ ! -f apps/api/.env ]; then
    cp apps/api/.env.example apps/api/.env
    echo "Created apps/api/.env"
fi
echo ""

echo "[6/6] Setting up Prisma..."
cd apps/api
pnpm prisma generate
if [ $? -ne 0 ]; then
    echo "Failed to generate Prisma Client"
    cd ../..
    exit 1
fi
pnpm prisma db push
if [ $? -ne 0 ]; then
    echo "Warning: Failed to push database schema"
    echo "Make sure PostgreSQL is running in Docker"
fi
cd ../..
echo ""

echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Run: pnpm dev"
echo "2. Open: http://localhost:3000 (Web)"
echo "3. Open: http://localhost:3001/health (API)"
echo ""
echo "Services status:"
docker-compose ps
echo ""
