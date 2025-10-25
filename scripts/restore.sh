#!/bin/bash

#######################################
# Music Streaming App - Restore Script
#######################################

set -e

# Load environment variables
if [ -f "$HOME/Streaming-App/.env" ]; then
    source "$HOME/Streaming-App/.env"
fi

# Configuration
BACKUP_DIR="${HOME}/backups/music-app"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    log_error "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# List available backups
log_info "Available database backups:"
ls -lh "$BACKUP_DIR"/db_backup_*.sql.gz | nl

echo ""
read -p "Enter the backup number to restore (or 'q' to quit): " backup_num

if [ "$backup_num" = "q" ]; then
    log_info "Restore cancelled"
    exit 0
fi

# Get the selected backup file
backup_file=$(ls "$BACKUP_DIR"/db_backup_*.sql.gz | sed -n "${backup_num}p")

if [ -z "$backup_file" ]; then
    log_error "Invalid backup number"
    exit 1
fi

log_warn "This will restore the database from: $backup_file"
log_warn "Current database data will be LOST!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    log_info "Restore cancelled"
    exit 0
fi

# Stop the backend service
log_info "Stopping backend service..."
cd "$HOME/Streaming-App"
docker-compose -f docker-compose.prod.yml stop backend

# Restore database
log_info "Restoring database..."
gunzip -c "$backup_file" | docker exec -i music_db psql -U ${DB_USER:-admin} -d ${DB_NAME:-music_streaming}

# Start the backend service
log_info "Starting backend service..."
docker-compose -f docker-compose.prod.yml start backend

log_info "Database restored successfully!"
log_info "Please verify your application is working correctly."
