# AWS Deployment Guide - Music Streaming App

Complete guide for deploying the Music Streaming Application on AWS with Traefik, SSL, and production-ready configuration for **music.ats-victorycenter.org**.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Setup](#aws-setup)
3. [DNS Configuration](#dns-configuration)
4. [EC2 Instance Setup](#ec2-instance-setup)
5. [Application Deployment](#application-deployment)
6. [SSL Certificate Setup](#ssl-certificate-setup)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Backup & Recovery](#backup--recovery)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts & Services

- ✅ AWS Account with EC2 access
- ✅ Domain name: `ats-victorycenter.org` with DNS access
- ✅ GitHub account (for repository access)
- ✅ Email address for Let's Encrypt notifications

### Required Information

- AWS Access Key ID and Secret Access Key
- S3 bucket name for file storage
- Strong passwords for database and JWT
- Email for SSL certificate notifications

---

## AWS Setup

### 1. Create S3 Bucket for Music Storage

```bash
# Via AWS CLI
aws s3 mb s3://music-streaming-victorycenter --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket music-streaming-victorycenter \
    --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
    --bucket music-streaming-victorycenter \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            }
        }]
    }'
```

**Via AWS Console:**
1. Go to S3 → Create bucket
2. Name: `music-streaming-victorycenter`
3. Region: `us-east-1`
4. Enable versioning
5. Enable default encryption
6. Block public access: **YES**

### 2. Create IAM User for Application

1. Go to IAM → Users → Add User
2. Name: `music-app-user`
3. Access type: **Programmatic access**
4. Attach policy: **AmazonS3FullAccess** (or create custom policy)

**Custom Policy (Recommended):**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::music-streaming-victorycenter",
                "arn:aws:s3:::music-streaming-victorycenter/*"
            ]
        }
    ]
}
```

5. **Save** Access Key ID and Secret Access Key securely

---

## DNS Configuration

### Configure DNS for music.ats-victorycenter.org

Add an **A Record** pointing to your EC2 instance's public IP:

| Type | Name  | Value          | TTL  |
|------|-------|----------------|------|
| A    | music | YOUR_EC2_IP    | 300  |

**Example using Route 53:**
```bash
aws route53 change-resource-record-sets \
    --hosted-zone-id YOUR_ZONE_ID \
    --change-batch '{
        "Changes": [{
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "music.ats-victorycenter.org",
                "Type": "A",
                "TTL": 300,
                "ResourceRecords": [{"Value": "YOUR_EC2_IP"}]
            }
        }]
    }'
```

**Verify DNS:**
```bash
nslookup music.ats-victorycenter.org
# Should return your EC2 IP
```

---

## EC2 Instance Setup

### 1. Launch EC2 Instance

**Recommended Specifications:**
- **Instance Type:** t3.medium (2 vCPU, 4 GB RAM) or larger
- **AMI:** Amazon Linux 2023 or Ubuntu 22.04 LTS
- **Storage:** 30 GB GP3 SSD (minimum)
- **Network:** VPC with public subnet

### 2. Security Group Configuration

Create security group with these inbound rules:

| Type  | Protocol | Port | Source    | Description        |
|-------|----------|------|-----------|--------------------|
| SSH   | TCP      | 22   | Your IP   | SSH access         |
| HTTP  | TCP      | 80   | 0.0.0.0/0 | HTTP (redirects)   |
| HTTPS | TCP      | 443  | 0.0.0.0/0 | HTTPS (main)       |

**Via AWS CLI:**
```bash
# Create security group
aws ec2 create-security-group \
    --group-name music-app-sg \
    --description "Music Streaming App Security Group"

# Add rules
aws ec2 authorize-security-group-ingress \
    --group-name music-app-sg \
    --protocol tcp --port 22 --cidr YOUR_IP/32

aws ec2 authorize-security-group-ingress \
    --group-name music-app-sg \
    --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-name music-app-sg \
    --protocol tcp --port 443 --cidr 0.0.0.0/0
```

### 3. Connect to EC2 Instance

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
# or for Ubuntu
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

---

## Application Deployment

### Option 1: Automated Deployment (Recommended)

```bash
# 1. Download deployment script
wget https://raw.githubusercontent.com/Makotis/Streaming-App/main/deploy-aws.sh

# 2. Make executable
chmod +x deploy-aws.sh

# 3. Run deployment
./deploy-aws.sh
```

The script will:
- Install Docker and Docker Compose
- Clone the repository
- Create `.env` file from template
- Setup directories
- Start services

### Option 2: Manual Deployment

#### Step 1: Install Dependencies

**For Amazon Linux 2023:**
```bash
sudo yum update -y
sudo yum install -y docker git
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and log back in
exit
```

**For Ubuntu 22.04:**
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose git
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker $USER

# Log out and log back in
exit
```

#### Step 2: Clone Repository

```bash
cd ~
git clone https://github.com/Makotis/Streaming-App.git
cd Streaming-App
```

#### Step 3: Configure Environment

```bash
# Copy example env file
cp .env.production.example .env

# Edit with your values
nano .env
```

**Required Configuration:**

```bash
# Domain
DOMAIN=music.ats-victorycenter.org

# Database (use strong passwords!)
DB_PASSWORD=your_strong_database_password

# AWS Credentials
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=music-streaming-victorycenter

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=your_64_character_random_string

# Let's Encrypt Email
LETSENCRYPT_EMAIL=your-email@example.com

# Traefik Dashboard Password (generate with: htpasswd -nb admin password)
TRAEFIK_DASHBOARD_AUTH=admin:$apr1$...
```

**Generate Strong Passwords:**
```bash
# JWT Secret
openssl rand -hex 32

# Database Password
openssl rand -base64 24

# Traefik Dashboard Password
# Install htpasswd first
sudo yum install -y httpd-tools  # Amazon Linux
# or
sudo apt-get install -y apache2-utils  # Ubuntu

# Generate hash
htpasswd -nb admin YourStrongPassword
# Copy the output to TRAEFIK_DASHBOARD_AUTH (escape $ with $$)
```

#### Step 4: Create Required Directories

```bash
mkdir -p letsencrypt
mkdir -p logs/traefik
mkdir -p traefik/dynamic
chmod 600 letsencrypt
```

#### Step 5: Deploy Application

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Watch logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## SSL Certificate Setup

### Automatic (Let's Encrypt via Traefik)

Traefik will automatically obtain SSL certificates from Let's Encrypt when:

1. ✅ DNS points to your EC2 IP
2. ✅ Ports 80 and 443 are accessible
3. ✅ LETSENCRYPT_EMAIL is set in `.env`

**Check Certificate Status:**
```bash
# View Traefik logs
docker logs music_traefik | grep -i "certificate"

# Check acme.json
sudo cat letsencrypt/acme.json
```

**Certificate Renewal:**
- Traefik automatically renews certificates 30 days before expiration
- No manual intervention required

### Troubleshooting SSL Issues

**Certificate not generating:**
```bash
# Check DNS
nslookup music.ats-victorycenter.org

# Check ports
sudo netstat -tulpn | grep -E ':(80|443)'

# Check Traefik logs
docker logs music_traefik --tail=100

# Verify domain accessibility
curl -I http://music.ats-victorycenter.org
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Run comprehensive health check
./scripts/health-check.sh
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f traefik
```

### Container Status

```bash
# View running containers
docker-compose -f docker-compose.prod.yml ps

# View resource usage
docker stats
```

### Traefik Dashboard

Access at: `https://music.ats-victorycenter.org/traefik/dashboard/`

Login with credentials from `TRAEFIK_DASHBOARD_AUTH` in `.env`

---

## Backup & Recovery

### Automated Backups

```bash
# Make backup script executable
chmod +x scripts/backup.sh

# Run manual backup
./scripts/backup.sh

# Setup automated daily backups (cron)
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * /home/ec2-user/Streaming-App/scripts/backup.sh >> /home/ec2-user/backup.log 2>&1
```

### Backup to S3

Ensure `S3_BACKUP_BUCKET` is set in `.env`:

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS CLI
aws configure
# Enter your AWS credentials
```

### Restore from Backup

```bash
# Make restore script executable
chmod +x scripts/restore.sh

# Run restore
./scripts/restore.sh
```

---

## Troubleshooting

### Common Issues

#### 1. Bad Gateway Error

**Cause:** Backend or frontend container not running

**Solution:**
```bash
# Check container status
docker ps

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Check logs
docker-compose -f docker-compose.prod.yml logs backend
```

#### 2. Port Already in Use

**Cause:** Another service using port 80 or 443

**Solution:**
```bash
# Find process using port
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# Stop conflicting service (example: nginx)
sudo systemctl stop nginx

# Restart containers
docker-compose -f docker-compose.prod.yml up -d
```

#### 3. Database Connection Error

**Cause:** Database not ready or wrong credentials

**Solution:**
```bash
# Check database container
docker logs music_db

# Verify credentials in .env match docker-compose.prod.yml

# Restart database
docker-compose -f docker-compose.prod.yml restart postgres
```

#### 4. SSL Certificate Not Working

**Cause:** DNS not propagated or ports blocked

**Solution:**
```bash
# Verify DNS
dig music.ats-victorycenter.org

# Check ports are open
curl -I http://music.ats-victorycenter.org

# Check Traefik logs
docker logs music_traefik --tail=50

# Delete and regenerate certificate
sudo rm -rf letsencrypt/acme.json
docker-compose -f docker-compose.prod.yml restart traefik
```

### Useful Commands

```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Clean up unused Docker resources
docker system prune -a

# Update application
cd ~/Streaming-App
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Production Checklist

Before going live, verify:

- [ ] DNS A record points to EC2 IP
- [ ] Security group allows ports 80 and 443
- [ ] `.env` file configured with strong passwords
- [ ] AWS credentials are valid
- [ ] S3 bucket is created and accessible
- [ ] SSL certificate obtained (check with browser)
- [ ] Application accessible at https://music.ats-victorycenter.org
- [ ] Backend API responding at https://music.ats-victorycenter.org/health
- [ ] Database backups configured
- [ ] Monitoring setup (optional: CloudWatch, Prometheus)

---

## Security Best Practices

1. **Strong Passwords:** Use generated passwords (32+ characters)
2. **SSH Key Only:** Disable password authentication
3. **Firewall:** Only allow necessary ports
4. **Updates:** Regularly update system and Docker images
5. **Backups:** Daily automated backups to S3
6. **Monitoring:** Setup alerts for downtime
7. **Secrets:** Never commit `.env` to git

---

## Scaling & Performance

### Vertical Scaling (Larger Instance)

Upgrade to t3.large or t3.xlarge for better performance

### Horizontal Scaling

- Use AWS ALB (Application Load Balancer)
- Deploy multiple EC2 instances
- Use RDS for PostgreSQL instead of container
- Use ElastiCache for Redis (if adding caching)

### Cost Optimization

- Use Reserved Instances for 1-3 year commitment
- Enable S3 Lifecycle policies to move old files to Glacier
- Use CloudFront CDN for static assets
- Monitor usage with AWS Cost Explorer

---

## Support & Resources

- **GitHub Repository:** https://github.com/Makotis/Streaming-App
- **Traefik Docs:** https://doc.traefik.io/traefik/
- **Docker Docs:** https://docs.docker.com/
- **AWS EC2 Docs:** https://docs.aws.amazon.com/ec2/

---

## License

MIT License - See LICENSE file for details

---

**Last Updated:** October 2025
**Version:** 2.0.0
