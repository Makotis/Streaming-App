#!/bin/bash

#######################################
# Music Streaming App - AWS Deployment
# For: music.ats-victorycenter.org
#######################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Log functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    log_error "Please do not run as root. Run as ec2-user or ubuntu."
    exit 1
fi

log_info "Starting deployment for music.ats-victorycenter.org..."

# Update system
log_info "Updating system packages..."
sudo yum update -y || sudo apt-get update -y

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    log_info "Installing Docker..."

    # Try Amazon Linux/RHEL
    if command -v yum &> /dev/null; then
        sudo yum install -y docker
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo usermod -a -G docker $USER
    # Try Ubuntu/Debian
    elif command -v apt-get &> /dev/null; then
        sudo apt-get install -y docker.io
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo usermod -a -G docker $USER
    fi

    log_warn "Docker installed. Please log out and log back in for group changes to take effect."
else
    log_info "Docker already installed."
fi

# Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null; then
    log_info "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    log_info "Docker Compose already installed."
fi

# Install git if not installed
if ! command -v git &> /dev/null; then
    log_info "Installing Git..."
    sudo yum install -y git || sudo apt-get install -y git
fi

# Set project directory
PROJECT_DIR="$HOME/Streaming-App"

# Clone or update repository
if [ -d "$PROJECT_DIR" ]; then
    log_info "Updating repository..."
    cd "$PROJECT_DIR"
    git pull origin main
else
    log_info "Cloning repository..."
    cd "$HOME"
    git clone https://github.com/Makotis/Streaming-App.git
    cd "$PROJECT_DIR"
fi

# Check if .env file exists
if [ ! -f "$PROJECT_DIR/.env" ]; then
    log_warn ".env file not found. Creating from example..."

    if [ -f "$PROJECT_DIR/.env.production.example" ]; then
        cp "$PROJECT_DIR/.env.production.example" "$PROJECT_DIR/.env"
        log_error "Please edit .env file with your actual values before continuing!"
        log_error "Run: nano $PROJECT_DIR/.env"
        exit 1
    else
        log_error ".env.production.example not found!"
        exit 1
    fi
fi

# Create required directories
log_info "Creating required directories..."
mkdir -p "$PROJECT_DIR/letsencrypt"
mkdir -p "$PROJECT_DIR/logs/traefik"
mkdir -p "$PROJECT_DIR/traefik/dynamic"
chmod 600 "$PROJECT_DIR/letsencrypt" || true

# Stop existing containers
log_info "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down || true

# Pull latest images
log_info "Pulling latest images..."
docker-compose -f docker-compose.prod.yml pull || true

# Build images
log_info "Building application images..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Start services
log_info "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
log_info "Waiting for services to start..."
sleep 10

# Check service status
log_info "Checking service status..."
docker-compose -f docker-compose.prod.yml ps

# Display logs
log_info "Displaying recent logs..."
docker-compose -f docker-compose.prod.yml logs --tail=50

# Health check
log_info "Performing health checks..."
sleep 5

if docker ps | grep -q "music_backend"; then
    log_info "✓ Backend container is running"
else
    log_error "✗ Backend container is not running"
fi

if docker ps | grep -q "music_frontend"; then
    log_info "✓ Frontend container is running"
else
    log_error "✗ Frontend container is not running"
fi

if docker ps | grep -q "music_traefik"; then
    log_info "✓ Traefik container is running"
else
    log_error "✗ Traefik container is not running"
fi

if docker ps | grep -q "music_db"; then
    log_info "✓ Database container is running"
else
    log_error "✗ Database container is not running"
fi

# Setup log rotation
log_info "Setting up log rotation..."
sudo tee /etc/logrotate.d/docker-music-app > /dev/null <<EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=10M
    missingok
    delaycompress
    copytruncate
}

$PROJECT_DIR/logs/traefik/*.log {
    rotate 14
    daily
    compress
    missingok
    delaycompress
    notifempty
}
EOF

# Setup automatic updates cron job
log_info "Setting up deployment script for easy updates..."
cat > "$PROJECT_DIR/update.sh" <<'UPDATEEOF'
#!/bin/bash
cd "$HOME/Streaming-App"
git pull origin main
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --build
docker system prune -f
UPDATEEOF

chmod +x "$PROJECT_DIR/update.sh"

log_info "================================================"
log_info "Deployment complete!"
log_info "================================================"
log_info ""
log_info "Your application should be accessible at:"
log_info "  https://music.ats-victorycenter.org"
log_info ""
log_info "Traefik Dashboard (if enabled):"
log_info "  https://music.ats-victorycenter.org/traefik/dashboard/"
log_info ""
log_info "Useful commands:"
log_info "  View logs:       docker-compose -f docker-compose.prod.yml logs -f"
log_info "  Restart:         docker-compose -f docker-compose.prod.yml restart"
log_info "  Stop:            docker-compose -f docker-compose.prod.yml down"
log_info "  Update app:      $PROJECT_DIR/update.sh"
log_info ""
log_info "Next steps:"
log_info "  1. Ensure DNS points music.ats-victorycenter.org to this server's IP"
log_info "  2. Wait a few minutes for Let's Encrypt SSL certificate"
log_info "  3. Check logs if you encounter issues"
log_info ""
