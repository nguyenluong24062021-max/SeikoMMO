#!/bin/bash
# =====================================
# PostgreSQL Database Backup Script (Linux/Mac)
# =====================================
# 
# Usage: ./backup-db.sh
# 
# This script creates a custom-format backup of the SeikoMMO database
# with automatic retention (keeps last 30 days)
#
# Setup for automated backups:
# 1. Edit configuration section below
# 2. Make executable: chmod +x backup-db.sh
# 3. Test manually: ./backup-db.sh
# 4. Schedule with cron (see docs/PROD.md)
#

set -e  # Exit on error

# =====================================
# Configuration
# =====================================
DB_NAME="seiko_mmo"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
BACKUP_DIR="/var/backups/postgres"
RETENTION_DAYS=30

# Generate timestamp for filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.backup"

# =====================================
# Create backup directory if not exists
# =====================================
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# =====================================
# Perform backup
# =====================================
echo "====================================="
echo "PostgreSQL Backup Script"
echo "====================================="
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo "Backup file: $BACKUP_FILE"
echo ""

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo "ERROR: pg_dump not found in PATH!"
    echo ""
    echo "Please install PostgreSQL client tools:"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "  RHEL/CentOS:   sudo yum install postgresql"
    echo "  macOS:         brew install postgresql"
    echo ""
    exit 1
fi

# Perform backup (custom format for best compression and restore options)
echo "Starting backup..."

# Use PGPASSWORD environment variable or .pgpass file for authentication
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --format=custom \
    --no-owner \
    --no-acl \
    --file="$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Backup completed successfully"
    echo "  File: $BACKUP_FILE"
    
    # Get file size
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "  Size: $FILE_SIZE"
    
    # =====================================
    # Cleanup old backups
    # =====================================
    echo ""
    echo "Cleaning up backups older than $RETENTION_DAYS days..."
    
    DELETED_COUNT=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.backup" -mtime +$RETENTION_DAYS -delete -print | wc -l)
    
    if [ "$DELETED_COUNT" -gt 0 ]; then
        echo "✓ Deleted $DELETED_COUNT old backup(s)"
    else
        echo "ℹ No old backups to clean up"
    fi
    
    echo ""
    echo "====================================="
    echo "Backup completed at $(date)"
    echo "====================================="
    
    exit 0
else
    echo ""
    echo "✗ Backup FAILED!"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check PostgreSQL is running"
    echo "  2. Verify DB_USER has backup permissions"
    echo "  3. Check disk space in $BACKUP_DIR"
    echo "  4. Verify database name: $DB_NAME"
    echo ""
    echo "Set PGPASSWORD environment variable or use ~/.pgpass file:"
    echo "  echo 'localhost:5432:$DB_NAME:$DB_USER:YOUR_PASSWORD' >> ~/.pgpass"
    echo "  chmod 600 ~/.pgpass"
    echo ""
    exit 1
fi
