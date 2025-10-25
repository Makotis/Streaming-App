#!/bin/bash

#######################################
# Music Streaming App - Health Check
#######################################

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
DOMAIN="music.ats-victorycenter.org"
PROJECT_DIR="$HOME/Streaming-App"

check_container() {
    local container=$1
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        echo -e "${GREEN}✓${NC} $container is running"
        return 0
    else
        echo -e "${RED}✗${NC} $container is NOT running"
        return 1
    fi
}

check_url() {
    local url=$1
    local name=$2
    if curl -sSf -o /dev/null "$url" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $name is accessible"
        return 0
    else
        echo -e "${RED}✗${NC} $name is NOT accessible"
        return 1
    fi
}

echo "======================================"
echo "  Music Streaming App - Health Check"
echo "======================================"
echo ""

# Check Docker
echo "Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗${NC} Docker is not installed"
    exit 1
else
    echo -e "${GREEN}✓${NC} Docker is installed"
fi

echo ""

# Check containers
echo "Checking containers..."
check_container "music_traefik"
check_container "music_frontend"
check_container "music_backend"
check_container "music_db"

echo ""

# Check URLs
echo "Checking URLs..."
check_url "https://$DOMAIN" "Frontend"
check_url "https://$DOMAIN/health" "Backend API"

echo ""

# Check disk space
echo "Disk Usage:"
df -h "$PROJECT_DIR" | tail -1

echo ""

# Check memory
echo "Memory Usage:"
free -h | grep Mem

echo ""

# Check Docker stats
echo "Container Stats:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo ""

# Check logs for errors
echo "Recent Errors in Logs:"
cd "$PROJECT_DIR"
ERROR_COUNT=$(docker-compose -f docker-compose.prod.yml logs --tail=100 2>&1 | grep -i error | wc -l)
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC} Found $ERROR_COUNT error(s) in recent logs"
    echo "Run 'docker-compose -f docker-compose.prod.yml logs' to view details"
else
    echo -e "${GREEN}✓${NC} No recent errors found"
fi

echo ""
echo "======================================"
echo "  Health Check Complete"
echo "======================================"
