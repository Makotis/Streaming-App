#!/bin/bash

# Music Streaming Platform - AWS Setup Script
# This script helps set up AWS resources for the music streaming platform

echo "🎵 Music Streaming Platform - AWS Setup"
echo "======================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run:"
    echo "   aws configure"
    exit 1
fi

echo "✅ AWS CLI detected and configured"

# Set variables
BUCKET_NAME=${AWS_S3_BUCKET:-"music-streaming-bucket-$(date +%s)"}
REGION=${AWS_REGION:-"us-east-1"}

echo ""
echo "📦 Creating S3 bucket for music files..."
echo "Bucket name: $BUCKET_NAME"
echo "Region: $REGION"

# Create S3 bucket
aws s3 mb s3://$BUCKET_NAME --region $REGION

if [ $? -eq 0 ]; then
    echo "✅ S3 bucket created successfully"
else
    echo "❌ Failed to create S3 bucket"
    exit 1
fi

# Configure bucket for public read access (for music streaming)
echo ""
echo "🔧 Configuring bucket permissions..."

# Create bucket policy for public read access to music files
cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/music/*"
        }
    ]
}
EOF

# Apply bucket policy
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json

# Configure CORS for web access
cat > cors-config.json << EOF
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
            "AllowedOrigins": ["*"],
            "MaxAgeSeconds": 3000
        }
    ]
}
EOF

aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file://cors-config.json

# Clean up temporary files
rm bucket-policy.json cors-config.json

echo "✅ Bucket permissions configured"

echo ""
echo "🔐 Setting up IAM user for application..."

# Create IAM user for the application
USER_NAME="music-streaming-app-user"
aws iam create-user --user-name $USER_NAME 2>/dev/null

# Create IAM policy for S3 access
cat > app-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::$BUCKET_NAME"
        }
    ]
}
EOF

# Create and attach policy
POLICY_NAME="MusicStreamingAppPolicy"
POLICY_ARN=$(aws iam create-policy --policy-name $POLICY_NAME --policy-document file://app-policy.json --query 'Policy.Arn' --output text 2>/dev/null)

if [ -z "$POLICY_ARN" ]; then
    POLICY_ARN="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/$POLICY_NAME"
fi

aws iam attach-user-policy --user-name $USER_NAME --policy-arn $POLICY_ARN

# Create access keys
echo "Creating access keys..."
ACCESS_KEY_OUTPUT=$(aws iam create-access-key --user-name $USER_NAME --output json)
ACCESS_KEY_ID=$(echo $ACCESS_KEY_OUTPUT | jq -r '.AccessKey.AccessKeyId')
SECRET_ACCESS_KEY=$(echo $ACCESS_KEY_OUTPUT | jq -r '.AccessKey.SecretAccessKey')

rm app-policy.json

echo "✅ IAM user and permissions configured"

echo ""
echo "📋 Setup Complete!"
echo "=================="
echo ""
echo "🔧 Update your .env file with these values:"
echo ""
echo "AWS_REGION=$REGION"
echo "AWS_S3_BUCKET=$BUCKET_NAME"
echo "AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID"
echo "AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY"
echo ""
echo "⚠️  IMPORTANT: Store these credentials securely!"
echo "⚠️  Do not commit them to version control!"
echo ""
echo "🚀 Your AWS resources are ready!"

# Optional RDS setup
echo ""
read -p "🗄️  Would you like to set up RDS for production database? (y/n): " setup_rds

if [[ $setup_rds =~ ^[Yy]$ ]]; then
    echo ""
    echo "🗄️  Setting up RDS PostgreSQL instance..."

    DB_INSTANCE_ID="music-streaming-db"
    DB_NAME="music_streaming"
    DB_USERNAME="admin"
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

    echo "Creating RDS instance (this may take several minutes)..."

    aws rds create-db-instance \
        --db-instance-identifier $DB_INSTANCE_ID \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --master-username $DB_USERNAME \
        --master-user-password $DB_PASSWORD \
        --allocated-storage 20 \
        --db-name $DB_NAME \
        --vpc-security-group-ids default \
        --backup-retention-period 7 \
        --multi-az false \
        --publicly-accessible true \
        --storage-encrypted false \
        --engine-version 15.3 \
        --region $REGION

    echo ""
    echo "⏳ RDS instance is being created..."
    echo "📋 Database configuration:"
    echo ""
    echo "DB_HOST=[Will be available after instance is ready]"
    echo "DB_PORT=5432"
    echo "DB_NAME=$DB_NAME"
    echo "DB_USER=$DB_USERNAME"
    echo "DB_PASSWORD=$DB_PASSWORD"
    echo ""
    echo "Run 'aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID' to get the endpoint when ready."
fi

echo ""
echo "✨ AWS setup completed successfully!"