# 🚀 AWS Deployment Guide - Music Streaming Platform

This guide will walk you through deploying the Music Streaming Platform on AWS using various services including ECS, EC2, RDS, and S3.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Method 1: ECS with Fargate (Recommended)](#method-1-ecs-with-fargate-recommended)
4. [Method 2: EC2 with Docker](#method-2-ec2-with-docker)
5. [Method 3: Elastic Beanstalk](#method-3-elastic-beanstalk)
6. [Shared AWS Resources Setup](#shared-aws-resources-setup)
7. [Domain & SSL Configuration](#domain--ssl-configuration)
8. [Monitoring & Logging](#monitoring--logging)
9. [Cost Optimization](#cost-optimization)
10. [Troubleshooting](#troubleshooting)

## 🏗️ Architecture Overview

### Production Architecture on AWS

```
Internet Gateway
       ↓
Application Load Balancer (ALB)
       ↓
┌─────────────────────────────────────┐
│            VPC                      │
│  ┌─────────────┐  ┌─────────────┐   │
│  │   Public    │  │   Private   │   │
│  │  Subnet     │  │   Subnet    │   │
│  │             │  │             │   │
│  │   ALB       │  │ ECS/EC2     │   │
│  │   NAT GW    │  │ Services    │   │
│  └─────────────┘  └─────────────┘   │
│                         ↓           │
│  ┌─────────────────────────────────┐ │
│  │         Private Subnet          │ │
│  │         RDS PostgreSQL          │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
              ↓
         Amazon S3
```

### AWS Services Used

- **ECS/EC2**: Container hosting
- **RDS**: PostgreSQL database
- **S3**: Audio file storage
- **ALB**: Load balancing
- **VPC**: Network isolation
- **CloudFront**: CDN (optional)
- **Route 53**: DNS management
- **Certificate Manager**: SSL certificates
- **CloudWatch**: Monitoring and logging

## 🔧 Prerequisites

### Required Tools
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install ECS CLI (for ECS deployment)
sudo curl -Lo /usr/local/bin/ecs-cli https://amazon-ecs-cli.s3.amazonaws.com/ecs-cli-linux-amd64-latest
sudo chmod +x /usr/local/bin/ecs-cli

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### AWS Account Setup
```bash
# Configure AWS credentials
aws configure

# Verify access
aws sts get-caller-identity
```

## 🐳 Method 1: ECS with Fargate (Recommended)

### 1.1 Setup Infrastructure

Create the infrastructure setup script:

```bash
# Create infrastructure directory
mkdir -p deployment/aws/ecs
cd deployment/aws/ecs
```

**Create `infrastructure.yaml` (CloudFormation):**

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Music Streaming Platform Infrastructure'

Parameters:
  ProjectName:
    Type: String
    Default: music-streaming
  Environment:
    Type: String
    Default: production

Resources:
  # VPC Configuration
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub ${ProjectName}-vpc

  # Internet Gateway
  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub ${ProjectName}-igw

  InternetGatewayAttachment:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      InternetGatewayId: !Ref InternetGateway
      VpcId: !Ref VPC

  # Public Subnets
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.1.0/24
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub ${ProjectName}-public-subnet-1

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: 10.0.2.0/24
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub ${ProjectName}-public-subnet-2

  # Private Subnets
  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.11.0/24
      Tags:
        - Key: Name
          Value: !Sub ${ProjectName}-private-subnet-1

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: 10.0.12.0/24
      Tags:
        - Key: Name
          Value: !Sub ${ProjectName}-private-subnet-2

  # NAT Gateways
  NatGateway1EIP:
    Type: AWS::EC2::EIP
    DependsOn: InternetGatewayAttachment
    Properties:
      Domain: vpc

  NatGateway1:
    Type: AWS::EC2::NatGateway
    Properties:
      AllocationId: !GetAtt NatGateway1EIP.AllocationId
      SubnetId: !Ref PublicSubnet1

  # Route Tables
  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${ProjectName}-public-routes

  DefaultPublicRoute:
    Type: AWS::EC2::Route
    DependsOn: InternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  PublicSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet1

  PublicSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet2

  PrivateRouteTable1:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${ProjectName}-private-routes-1

  DefaultPrivateRoute1:
    Type: AWS::EC2::Route
    Properties:
      RouteTableId: !Ref PrivateRouteTable1
      DestinationCidrBlock: 0.0.0.0/0
      NatGatewayId: !Ref NatGateway1

  PrivateSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PrivateRouteTable1
      SubnetId: !Ref PrivateSubnet1

  PrivateSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PrivateRouteTable1
      SubnetId: !Ref PrivateSubnet2

  # Security Groups
  ALBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub ${ProjectName}-alb-sg
      GroupDescription: Security group for ALB
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0

  ECSSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub ${ProjectName}-ecs-sg
      GroupDescription: Security group for ECS tasks
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 3000
          ToPort: 3001
          SourceSecurityGroupId: !Ref ALBSecurityGroup

  RDSSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: !Sub ${ProjectName}-rds-sg
      GroupDescription: Security group for RDS
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 5432
          ToPort: 5432
          SourceSecurityGroupId: !Ref ECSSecurityGroup

  # RDS Subnet Group
  RDSSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnet group for RDS
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
      Tags:
        - Key: Name
          Value: !Sub ${ProjectName}-rds-subnet-group

  # ECS Cluster
  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: !Sub ${ProjectName}-cluster

  # Application Load Balancer
  ApplicationLoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: !Sub ${ProjectName}-alb
      Scheme: internet-facing
      Type: application
      Subnets:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2
      SecurityGroups:
        - !Ref ALBSecurityGroup

Outputs:
  VPC:
    Description: VPC ID
    Value: !Ref VPC
    Export:
      Name: !Sub ${ProjectName}-VPC

  PublicSubnets:
    Description: Public subnets
    Value: !Join [',', [!Ref PublicSubnet1, !Ref PublicSubnet2]]
    Export:
      Name: !Sub ${ProjectName}-PublicSubnets

  PrivateSubnets:
    Description: Private subnets
    Value: !Join [',', [!Ref PrivateSubnet1, !Ref PrivateSubnet2]]
    Export:
      Name: !Sub ${ProjectName}-PrivateSubnets

  ECSCluster:
    Description: ECS Cluster
    Value: !Ref ECSCluster
    Export:
      Name: !Sub ${ProjectName}-ECSCluster

  ALB:
    Description: Application Load Balancer
    Value: !Ref ApplicationLoadBalancer
    Export:
      Name: !Sub ${ProjectName}-ALB

  ALBDNSName:
    Description: ALB DNS Name
    Value: !GetAtt ApplicationLoadBalancer.DNSName
    Export:
      Name: !Sub ${ProjectName}-ALBDNSName

  ECSSecurityGroup:
    Description: ECS Security Group
    Value: !Ref ECSSecurityGroup
    Export:
      Name: !Sub ${ProjectName}-ECSSecurityGroup

  RDSSecurityGroup:
    Description: RDS Security Group
    Value: !Ref RDSSecurityGroup
    Export:
      Name: !Sub ${ProjectName}-RDSSecurityGroup

  RDSSubnetGroup:
    Description: RDS Subnet Group
    Value: !Ref RDSSubnetGroup
    Export:
      Name: !Sub ${ProjectName}-RDSSubnetGroup
```

### 1.2 Deploy Infrastructure

```bash
# Deploy the CloudFormation stack
aws cloudformation deploy \
  --template-file infrastructure.yaml \
  --stack-name music-streaming-infrastructure \
  --capabilities CAPABILITY_IAM \
  --region us-east-1
```

### 1.3 Setup RDS Database

**Create `database.yaml`:**

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'RDS PostgreSQL Database'

Parameters:
  ProjectName:
    Type: String
    Default: music-streaming
  DBPassword:
    Type: String
    NoEcho: true
    MinLength: 8
    Description: Database password

Resources:
  DBInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub ${ProjectName}-db
      DBInstanceClass: db.t3.micro
      Engine: postgres
      EngineVersion: '15.3'
      MasterUsername: admin
      MasterUserPassword: !Ref DBPassword
      AllocatedStorage: 20
      StorageType: gp2
      DBName: music_streaming
      VPCSecurityGroups:
        - !ImportValue
          Fn::Sub: ${ProjectName}-RDSSecurityGroup
      DBSubnetGroupName: !ImportValue
        Fn::Sub: ${ProjectName}-RDSSubnetGroup
      BackupRetentionPeriod: 7
      DeleteAutomatedBackups: true
      DeletionProtection: false

Outputs:
  DBEndpoint:
    Description: Database endpoint
    Value: !GetAtt DBInstance.Endpoint.Address
    Export:
      Name: !Sub ${ProjectName}-DBEndpoint
```

Deploy the database:

```bash
# Deploy RDS
aws cloudformation deploy \
  --template-file database.yaml \
  --stack-name music-streaming-database \
  --parameter-overrides DBPassword=YourSecurePassword123! \
  --region us-east-1
```

### 1.4 Setup ECR Repositories

```bash
# Create ECR repositories
aws ecr create-repository --repository-name music-streaming/backend --region us-east-1
aws ecr create-repository --repository-name music-streaming/frontend --region us-east-1
aws ecr create-repository --repository-name music-streaming/nginx --region us-east-1

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

### 1.5 Build and Push Images

**Create `build-and-push.sh`:**

```bash
#!/bin/bash

# Variables
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=us-east-1
ECR_REGISTRY=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# Build and push backend
echo "Building backend..."
docker build -t music-streaming/backend ./backend
docker tag music-streaming/backend:latest $ECR_REGISTRY/music-streaming/backend:latest
docker push $ECR_REGISTRY/music-streaming/backend:latest

# Build and push frontend
echo "Building frontend..."
docker build -t music-streaming/frontend ./frontend
docker tag music-streaming/frontend:latest $ECR_REGISTRY/music-streaming/frontend:latest
docker push $ECR_REGISTRY/music-streaming/frontend:latest

# Build and push nginx
echo "Building nginx..."
docker build -t music-streaming/nginx -f nginx/Dockerfile ./nginx
docker tag music-streaming/nginx:latest $ECR_REGISTRY/music-streaming/nginx:latest
docker push $ECR_REGISTRY/music-streaming/nginx:latest

echo "All images pushed successfully!"
```

Run the build script:

```bash
chmod +x build-and-push.sh
./build-and-push.sh
```

### 1.6 Create ECS Task Definitions

**Create `ecs-services.yaml`:**

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'ECS Services for Music Streaming Platform'

Parameters:
  ProjectName:
    Type: String
    Default: music-streaming
  BackendImage:
    Type: String
  FrontendImage:
    Type: String
  NginxImage:
    Type: String
  DBEndpoint:
    Type: String
  DBPassword:
    Type: String
    NoEcho: true
  S3Bucket:
    Type: String
  AWSAccessKeyId:
    Type: String
  AWSSecretAccessKey:
    Type: String
    NoEcho: true

Resources:
  # ECS Task Execution Role
  ECSTaskExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Effect: Allow
            Principal:
              Service: ecs-tasks.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

  # ECS Task Role
  ECSTaskRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Effect: Allow
            Principal:
              Service: ecs-tasks.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: S3Access
          PolicyDocument:
            Statement:
              - Effect: Allow
                Action:
                  - s3:GetObject
                  - s3:PutObject
                  - s3:DeleteObject
                Resource: !Sub 'arn:aws:s3:::${S3Bucket}/*'
              - Effect: Allow
                Action:
                  - s3:ListBucket
                Resource: !Sub 'arn:aws:s3:::${S3Bucket}'

  # Task Definition
  TaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: !Sub ${ProjectName}-task
      NetworkMode: awsvpc
      RequiresCompatibilities:
        - FARGATE
      Cpu: 1024
      Memory: 2048
      ExecutionRoleArn: !Ref ECSTaskExecutionRole
      TaskRoleArn: !Ref ECSTaskRole
      ContainerDefinitions:
        - Name: postgres
          Image: postgres:15-alpine
          Memory: 512
          Environment:
            - Name: POSTGRES_DB
              Value: music_streaming
            - Name: POSTGRES_USER
              Value: admin
            - Name: POSTGRES_PASSWORD
              Value: !Ref DBPassword
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: !Ref LogGroup
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: postgres

        - Name: backend
          Image: !Ref BackendImage
          Memory: 512
          PortMappings:
            - ContainerPort: 3001
          Environment:
            - Name: NODE_ENV
              Value: production
            - Name: DB_HOST
              Value: !Ref DBEndpoint
            - Name: DB_PORT
              Value: '5432'
            - Name: DB_NAME
              Value: music_streaming
            - Name: DB_USER
              Value: admin
            - Name: DB_PASSWORD
              Value: !Ref DBPassword
            - Name: AWS_REGION
              Value: !Ref AWS::Region
            - Name: AWS_S3_BUCKET
              Value: !Ref S3Bucket
            - Name: AWS_ACCESS_KEY_ID
              Value: !Ref AWSAccessKeyId
            - Name: AWS_SECRET_ACCESS_KEY
              Value: !Ref AWSSecretAccessKey
            - Name: JWT_SECRET
              Value: your-production-jwt-secret-here
          DependsOn:
            - ContainerName: postgres
              Condition: START
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: !Ref LogGroup
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: backend

        - Name: frontend
          Image: !Ref FrontendImage
          Memory: 512
          PortMappings:
            - ContainerPort: 3000
          Environment:
            - Name: REACT_APP_API_URL
              Value: http://localhost
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: !Ref LogGroup
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: frontend

        - Name: nginx
          Image: !Ref NginxImage
          Memory: 256
          PortMappings:
            - ContainerPort: 80
          DependsOn:
            - ContainerName: backend
              Condition: START
            - ContainerName: frontend
              Condition: START
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: !Ref LogGroup
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: nginx

  # CloudWatch Log Group
  LogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub /ecs/${ProjectName}
      RetentionInDays: 14

  # ECS Service
  ECSService:
    Type: AWS::ECS::Service
    Properties:
      ServiceName: !Sub ${ProjectName}-service
      Cluster: !ImportValue
        Fn::Sub: ${ProjectName}-ECSCluster
      TaskDefinition: !Ref TaskDefinition
      LaunchType: FARGATE
      DesiredCount: 1
      NetworkConfiguration:
        AwsvpcConfiguration:
          SecurityGroups:
            - !ImportValue
              Fn::Sub: ${ProjectName}-ECSSecurityGroup
          Subnets: !Split
            - ','
            - !ImportValue
              Fn::Sub: ${ProjectName}-PrivateSubnets
          AssignPublicIp: DISABLED
      LoadBalancers:
        - ContainerName: nginx
          ContainerPort: 80
          TargetGroupArn: !Ref TargetGroup

  # Target Group
  TargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Name: !Sub ${ProjectName}-tg
      Port: 80
      Protocol: HTTP
      TargetType: ip
      VpcId: !ImportValue
        Fn::Sub: ${ProjectName}-VPC
      HealthCheckPath: /health
      HealthCheckProtocol: HTTP
      HealthCheckIntervalSeconds: 30
      HealthyThresholdCount: 2
      UnhealthyThresholdCount: 3

  # ALB Listener
  ALBListener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      DefaultActions:
        - Type: forward
          TargetGroupArn: !Ref TargetGroup
      LoadBalancerArn: !ImportValue
        Fn::Sub: ${ProjectName}-ALB
      Port: 80
      Protocol: HTTP

Outputs:
  ServiceName:
    Description: ECS Service Name
    Value: !Ref ECSService
```

### 1.7 Deploy ECS Services

```bash
# Get the image URIs and other parameters
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BACKEND_IMAGE=$AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/music-streaming/backend:latest
FRONTEND_IMAGE=$AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/music-streaming/frontend:latest
NGINX_IMAGE=$AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/music-streaming/nginx:latest
DB_ENDPOINT=$(aws cloudformation describe-stacks --stack-name music-streaming-database --query 'Stacks[0].Outputs[?OutputKey==`DBEndpoint`].OutputValue' --output text)

# Deploy ECS services
aws cloudformation deploy \
  --template-file ecs-services.yaml \
  --stack-name music-streaming-services \
  --parameter-overrides \
    BackendImage=$BACKEND_IMAGE \
    FrontendImage=$FRONTEND_IMAGE \
    NginxImage=$NGINX_IMAGE \
    DBEndpoint=$DB_ENDPOINT \
    DBPassword=YourSecurePassword123! \
    S3Bucket=your-music-bucket \
    AWSAccessKeyId=YOUR_ACCESS_KEY \
    AWSSecretAccessKey=YOUR_SECRET_KEY \
  --capabilities CAPABILITY_IAM \
  --region us-east-1
```

## 🖥️ Method 2: EC2 with Docker

### 2.1 Launch EC2 Instance

**Create `ec2-userdata.sh`:**

```bash
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
git clone https://github.com/your-username/music-streaming-platform.git
cd music-streaming-platform

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
```

Launch EC2 instance:

```bash
# Create security group
aws ec2 create-security-group \
  --group-name music-streaming-sg \
  --description "Security group for music streaming platform"

# Get security group ID
SG_ID=$(aws ec2 describe-security-groups --group-names music-streaming-sg --query 'SecurityGroups[0].GroupId' --output text)

# Add inbound rules
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0

# Launch instance
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids $SG_ID \
  --user-data file://ec2-userdata.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=music-streaming-server}]'
```

### 2.2 Configure Production Environment

SSH into your instance and update the configuration:

```bash
# SSH into instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Navigate to project
cd music-streaming-platform

# Update environment variables
sudo nano .env

# Update Docker Compose for production
sudo nano docker-compose.prod.yml
```

**Create `docker-compose.prod.yml`:**

```yaml
version: '3.8'

services:
  backend:
    restart: always
    environment:
      NODE_ENV: production
      DB_HOST: your-rds-endpoint
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  frontend:
    restart: always
    environment:
      NODE_ENV: production
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  nginx:
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl
    deploy:
      resources:
        limits:
          memory: 128M
        reservations:
          memory: 64M

  postgres:
    restart: always
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M

volumes:
  postgres_data:
    driver: local
```

Start production services:

```bash
# Stop development services
sudo docker-compose down

# Start production services
sudo docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🌱 Method 3: Elastic Beanstalk

### 3.1 Prepare Application

**Create `Dockerrun.aws.json`:**

```json
{
  "AWSEBDockerrunVersion": 2,
  "containerDefinitions": [
    {
      "name": "postgres",
      "image": "postgres:15-alpine",
      "essential": true,
      "memory": 512,
      "environment": [
        {
          "name": "POSTGRES_DB",
          "value": "music_streaming"
        },
        {
          "name": "POSTGRES_USER",
          "value": "admin"
        },
        {
          "name": "POSTGRES_PASSWORD",
          "value": "password123"
        }
      ]
    },
    {
      "name": "backend",
      "image": "your-account.dkr.ecr.us-east-1.amazonaws.com/music-streaming/backend:latest",
      "essential": true,
      "memory": 512,
      "portMappings": [
        {
          "hostPort": 3001,
          "containerPort": 3001
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DB_HOST",
          "value": "localhost"
        }
      ],
      "links": ["postgres"]
    },
    {
      "name": "frontend",
      "image": "your-account.dkr.ecr.us-east-1.amazonaws.com/music-streaming/frontend:latest",
      "essential": true,
      "memory": 512,
      "portMappings": [
        {
          "hostPort": 3000,
          "containerPort": 3000
        }
      ]
    },
    {
      "name": "nginx",
      "image": "your-account.dkr.ecr.us-east-1.amazonaws.com/music-streaming/nginx:latest",
      "essential": true,
      "memory": 256,
      "portMappings": [
        {
          "hostPort": 80,
          "containerPort": 80
        }
      ],
      "links": ["backend", "frontend"]
    }
  ]
}
```

### 3.2 Deploy to Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize EB application
eb init music-streaming-platform

# Create environment
eb create production

# Deploy application
eb deploy
```

## 🔧 Shared AWS Resources Setup

### Setup S3 and Related Services

Run the AWS setup script that was created earlier:

```bash
# Make sure you're in the project root
cd /path/to/music-streaming-platform

# Run AWS setup
chmod +x scripts/setup-aws.sh
./scripts/setup-aws.sh
```

This will create:
- S3 bucket for music files
- IAM user with appropriate permissions
- Bucket policies for public access
- CORS configuration

### Additional AWS Services Setup

**Create CloudFront Distribution (Optional):**

```bash
# Create CloudFront distribution for better performance
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

**`cloudfront-config.json`:**

```json
{
  "CallerReference": "music-streaming-$(date +%s)",
  "Comment": "Music Streaming Platform CDN",
  "DefaultCacheBehavior": {
    "TargetOriginId": "ALB-Origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "MinTTL": 0,
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": {
        "Forward": "none"
      }
    }
  },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "ALB-Origin",
        "DomainName": "your-alb-dns-name.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only"
        }
      }
    ]
  },
  "Enabled": true
}
```

## 🌐 Domain & SSL Configuration

### 1. Route 53 Setup

```bash
# Create hosted zone
aws route53 create-hosted-zone --name your-domain.com --caller-reference $(date +%s)

# Create A record pointing to ALB
aws route53 change-resource-record-sets --hosted-zone-id Z123456789 --change-batch file://dns-record.json
```

**`dns-record.json`:**

```json
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "your-domain.com",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "your-alb-dns-name.amazonaws.com",
          "EvaluateTargetHealth": false,
          "HostedZoneId": "Z35SXDOTRQ7X7K"
        }
      }
    }
  ]
}
```

### 2. SSL Certificate

```bash
# Request SSL certificate
aws acm request-certificate \
  --domain-name your-domain.com \
  --domain-name www.your-domain.com \
  --validation-method DNS \
  --region us-east-1
```

### 3. Update ALB Listener for HTTPS

```bash
# Add HTTPS listener to ALB
aws elbv2 create-listener \
  --load-balancer-arn your-alb-arn \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=your-certificate-arn \
  --default-actions Type=forward,TargetGroupArn=your-target-group-arn
```

## 📊 Monitoring & Logging

### 1. CloudWatch Dashboards

**Create monitoring dashboard:**

```bash
aws cloudwatch put-dashboard \
  --dashboard-name MusicStreamingPlatform \
  --dashboard-body file://dashboard-config.json
```

**`dashboard-config.json`:**

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", "ServiceName", "music-streaming-service"],
          ["AWS/ECS", "MemoryUtilization", "ServiceName", "music-streaming-service"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "ECS Metrics"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "app/music-streaming-alb"],
          ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "app/music-streaming-alb"]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "ALB Metrics"
      }
    }
  ]
}
```

### 2. CloudWatch Alarms

```bash
# CPU utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "ECS-HighCPU" \
  --alarm-description "Alarm when ECS CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Memory utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "ECS-HighMemory" \
  --alarm-description "Alarm when ECS Memory exceeds 80%" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

## 💰 Cost Optimization

### 1. Auto Scaling Configuration

**ECS Auto Scaling:**

```bash
# Create auto scaling target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/music-streaming-cluster/music-streaming-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 \
  --max-capacity 5

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --policy-name music-streaming-scale-up \
  --service-namespace ecs \
  --resource-id service/music-streaming-cluster/music-streaming-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

**`scaling-policy.json`:**

```json
{
  "TargetValue": 70.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleOutCooldown": 300,
  "ScaleInCooldown": 300
}
```

### 2. Spot Instances (for EC2 deployment)

```bash
# Create spot fleet request
aws ec2 request-spot-fleet --spot-fleet-request-config file://spot-fleet-config.json
```

### 3. Reserved Instances

```bash
# Purchase reserved instances for predictable workloads
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id offering-id \
  --instance-count 1
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. ECS Tasks Not Starting

```bash
# Check service events
aws ecs describe-services \
  --cluster music-streaming-cluster \
  --services music-streaming-service

# Check task logs
aws logs get-log-events \
  --log-group-name /ecs/music-streaming \
  --log-stream-name ecs/nginx/task-id
```

#### 2. Database Connection Issues

```bash
# Test RDS connectivity
aws rds describe-db-instances --db-instance-identifier music-streaming-db

# Check security groups
aws ec2 describe-security-groups --group-ids sg-xxxxxxxxx
```

#### 3. S3 Upload Issues

```bash
# Check bucket policy
aws s3api get-bucket-policy --bucket your-music-bucket

# Test S3 access
aws s3 ls s3://your-music-bucket/
```

#### 4. ALB Health Check Failures

```bash
# Check target group health
aws elbv2 describe-target-health --target-group-arn your-target-group-arn

# Check ALB logs
aws logs filter-log-events \
  --log-group-name /aws/applicationloadbalancer/app/music-streaming-alb
```

### Performance Optimization

#### 1. Enable ALB Access Logs

```bash
# Enable ALB access logs
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn your-alb-arn \
  --attributes Key=access_logs.s3.enabled,Value=true Key=access_logs.s3.bucket,Value=your-logs-bucket
```

#### 2. Database Performance

```bash
# Enable Performance Insights
aws rds modify-db-instance \
  --db-instance-identifier music-streaming-db \
  --enable-performance-insights \
  --apply-immediately
```

### Monitoring Commands

```bash
# Monitor ECS service
watch -n 30 'aws ecs describe-services --cluster music-streaming-cluster --services music-streaming-service --query "services[0].{Status:status,Running:runningCount,Desired:desiredCount}"'

# Monitor ALB targets
watch -n 30 'aws elbv2 describe-target-health --target-group-arn your-target-group-arn'

# Check application logs
aws logs tail /ecs/music-streaming --follow
```

## 📚 Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## 🔐 Security Best Practices

1. **Use IAM roles instead of access keys where possible**
2. **Enable VPC Flow Logs for network monitoring**
3. **Use AWS Secrets Manager for sensitive data**
4. **Enable AWS Config for compliance monitoring**
5. **Regular security audits with AWS Security Hub**
6. **Use AWS WAF for application protection**

---

This deployment guide provides multiple deployment options based on your requirements and AWS experience level. Choose the method that best fits your needs and scale accordingly.