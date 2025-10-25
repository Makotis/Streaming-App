# Quick Start Guide - Music Streaming App

Get your music streaming app running on AWS in under 30 minutes!

---

## Prerequisites

- ✅ AWS EC2 instance running (Ubuntu 22.04 or Amazon Linux 2023)
- ✅ Domain `music.ats-victorycenter.org` pointing to your EC2 IP
- ✅ Ports 80 and 443 open in security group
- ✅ SSH access to the server

---

## One-Command Deployment

### Step 1: SSH into Your Server

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
```

### Step 2: Run Deployment Script

```bash
curl -sSL https://raw.githubusercontent.com/Makotis/Streaming-App/main/deploy-aws.sh | bash
```

**The script will pause and ask you to configure `.env`**

### Step 3: Configure Environment

```bash
cd ~/Streaming-App
nano .env
```

**Update these required values:**

```bash
# Your domain
DOMAIN=music.ats-victorycenter.org

# Strong database password
DB_PASSWORD=ChangeMe123!StrongPassword

# Your AWS credentials
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_S3_BUCKET=music-streaming-victorycenter

# Generate with: openssl rand -hex 32
JWT_SECRET=your-random-64-character-string-here

# Your email for SSL certificate notifications
LETSENCRYPT_EMAIL=your-email@example.com
```

**Generate passwords:**
```bash
# JWT Secret
openssl rand -hex 32

# Database password
openssl rand -base64 24
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

### Step 4: Resume Deployment

```bash
./deploy-aws.sh
```

### Step 5: Verify Deployment

```bash
# Check all services are running
docker ps

# You should see 4 containers:
# - music_traefik
# - music_frontend
# - music_backend
# - music_db
```

---

## Access Your Application

- **Website:** https://music.ats-victorycenter.org
- **API Health:** https://music.ats-victorycenter.org/health
- **Traefik Dashboard:** https://music.ats-victorycenter.org/traefik/dashboard/

**SSL Certificate:** Will be automatically obtained within 2-3 minutes after deployment.

---

## Common Post-Deployment Tasks

### View Logs

```bash
cd ~/Streaming-App
docker-compose -f docker-compose.prod.yml logs -f
```

### Check Application Health

```bash
./scripts/health-check.sh
```

### Setup Automated Backups

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Add to crontab for daily 2 AM backups
crontab -e

# Add this line:
0 2 * * * /home/ec2-user/Streaming-App/scripts/backup.sh >> /home/ec2-user/backup.log 2>&1
```

### Update Application

```bash
cd ~/Streaming-App
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Troubleshooting

### Application Not Loading

```bash
# Check if containers are running
docker ps

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### SSL Certificate Not Working

```bash
# Verify DNS is correct
nslookup music.ats-victorycenter.org

# Check Traefik logs
docker logs music_traefik --tail=50

# Wait 2-3 minutes for certificate generation
# Then refresh browser
```

### Bad Gateway Error

```bash
# Restart backend
docker-compose -f docker-compose.prod.yml restart backend

# Check backend logs
docker logs music_backend --tail=50
```

---

## Next Steps

1. ✅ **Test Registration:** Create a user account
2. ✅ **Upload Music:** Test file upload functionality
3. ✅ **Configure Backups:** Setup automated backups
4. ✅ **Monitor:** Setup monitoring alerts
5. ✅ **Customize:** Update branding and content

---

## Need Help?

📖 **Full Documentation:** See [AWS-DEPLOYMENT-GUIDE.md](./AWS-DEPLOYMENT-GUIDE.md)

🐛 **Issues:** https://github.com/Makotis/Streaming-App/issues

---

**Deployment Time:** ~15-30 minutes
**Domain:** music.ats-victorycenter.org
**SSL:** Automatic via Let's Encrypt
