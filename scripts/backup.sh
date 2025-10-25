#!/bin/bash

#######################################
# Music Streaming App - Backup Script
#######################################

set -e

# Load environment variables
if [ -f "$HOME/Streaming-App/.env" ]; then
    source "$HOME/Streaming-App/.env"
fi

# Configuration
BACKUP_DIR="${HOME}/backups/music-app"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

log_info "Starting backup at $(date)"

# Backup database
log_info "Backing up PostgreSQL database..."
docker exec music_db pg_dump -U ${DB_USER:-admin} ${DB_NAME:-music_streaming} > "$BACKUP_DIR/db_backup_$DATE.sql"
gzip "$BACKUP_DIR/db_backup_$DATE.sql"

# Backup environment file
log_info "Backing up environment configuration..."
cp "$HOME/Streaming-App/.env" "$BACKUP_DIR/env_backup_$DATE"

# Backup Let's Encrypt certificates
log_info "Backing up SSL certificates..."
if [ -d "$HOME/Streaming-App/letsencrypt" ]; then
    tar -czf "$BACKUP_DIR/letsencrypt_backup_$DATE.tar.gz" -C "$HOME/Streaming-App" letsencrypt
fi

# Create backup manifest
cat > "$BACKUP_DIR/manifest_$DATE.txt" <<EOF
Backup Date: $(date)
Database: ${DB_NAME:-music_streaming}
Files Included:
- Database dump: db_backup_$DATE.sql.gz
- Environment: env_backup_$DATE
- SSL Certificates: letsencrypt_backup_$DATE.tar.gz
EOF

# Upload to S3 if configured
if [ ! -z "$S3_BACKUP_BUCKET" ] && command -v aws &> /dev/null; then
    log_info "Uploading backups to S3..."
    aws s3 cp "$BACKUP_DIR/db_backup_$DATE.sql.gz" "s3://$S3_BACKUP_BUCKET/music-app/"
    aws s3 cp "$BACKUP_DIR/env_backup_$DATE" "s3://$S3_BACKUP_BUCKET/music-app/"
    aws s3 cp "$BACKUP_DIR/letsencrypt_backup_$DATE.tar.gz" "s3://$S3_BACKUP_BUCKET/music-app/"
    log_info "Backups uploaded to S3"
fi

# Remove old backups
log_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "env_backup_*" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "manifest_*" -mtime +$RETENTION_DAYS -delete

log_info "Backup completed successfully at $(date)"
log_info "Backup location: $BACKUP_DIR"
