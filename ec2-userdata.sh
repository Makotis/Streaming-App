#!/bin/bash
yum update -y
yum install -y docker git

# Start Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone repository (replace with your repo)
cd /home/ec2-user
git clone https://github.com/Makotis/Streaming-App.git
mkdir Streaming-App
cd Streaming-App

# Setup environment
cp .env.example .env
# Update .env with your values

# Start services
docker-compose up -d

# Setup log rotation
cat > /etc/logrotate.d/docker-logs << EOF
/var/lib/docker/containers/*/*.log {
  rotate 5
  daily
  compress
  size=10M
  missingok
  delaycompress
  copytruncate
}
EOF