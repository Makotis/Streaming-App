# 🎵 Music Streaming Platform

A full-stack music streaming application built with React, Node.js, PostgreSQL, and AWS services, containerized with Docker.

## ✨ Features

- **User Authentication**: Secure registration and login system
- **Music Upload**: Upload audio files to AWS S3 with metadata
- **Music Streaming**: Stream music directly from S3
- **Search & Discovery**: Search songs by title, artist, or album
- **User Profiles**: Manage uploaded songs and profile information
- **Responsive Design**: Works on desktop and mobile devices

## 🏗️ Architecture

### Services
- **Frontend**: React.js application with modern UI
- **Backend**: Node.js/Express API server
- **Database**: PostgreSQL for metadata storage
- **File Storage**: AWS S3 for audio files
- **Reverse Proxy**: Nginx for load balancing
- **Containerization**: Docker & Docker Compose

### AWS Integration
- **S3**: Store and serve audio files
- **RDS** (optional): Production PostgreSQL database
- **IAM**: Secure access management

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- AWS Account (for file storage)
- Node.js (for local development)

### 1. Clone & Setup
```bash
git clone <your-repo>
cd music-streaming-platform
cp .env.example .env
```

### 2. Configure AWS
Run the AWS setup script:
```bash
chmod +x scripts/setup-aws.sh
./scripts/setup-aws.sh
```

Update your `.env` file with the AWS credentials provided by the setup script.

### 3. Start the Application
```bash
# Build and start all services
npm run dev

# Or use Docker Compose directly
docker-compose up -d
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Full App (via Nginx)**: http://localhost:80

## 📁 Project Structure

```
music-streaming-platform/
├── backend/                 # Node.js/Express API
│   ├── config/             # Database and AWS config
│   ├── models/             # Data models
│   ├── routes/             # API routes
│   ├── middleware/         # Authentication middleware
│   ├── init.sql            # Database schema
│   ├── Dockerfile
│   └── package.json
├── frontend/               # React application
│   ├── public/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   ├── Dockerfile
│   └── package.json
├── nginx/                  # Nginx configuration
│   └── nginx.conf
├── scripts/                # Setup scripts
│   └── setup-aws.sh        # AWS resource setup
├── docker-compose.yml      # Docker orchestration
├── .env.example           # Environment variables template
└── README.md
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=music_streaming
DB_USER=admin
DB_PASSWORD=password123

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your-bucket-name

# Security
JWT_SECRET=your-jwt-secret

# URLs
FRONTEND_URL=http://localhost:3000
```

### AWS Setup

1. **S3 Bucket**: For audio file storage
   - Public read access for music streaming
   - CORS configuration for web access

2. **IAM User**: Application-specific permissions
   - S3 read/write access
   - Secure access keys

3. **RDS** (Optional): Production database
   - PostgreSQL instance
   - Automated backups

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Music
- `GET /api/music` - List songs (with search)
- `GET /api/music/:id` - Get specific song
- `POST /api/music/upload` - Upload new song
- `GET /api/music/user/:userId` - Get user's songs
- `DELETE /api/music/:id` - Delete song

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile

## 🛠️ Development

### Local Development Setup

1. **Backend Development**:
```bash
cd backend
npm install
npm run dev
```

2. **Frontend Development**:
```bash
cd frontend
npm install
npm start
```

3. **Database Setup**:
```bash
# Start PostgreSQL with Docker
docker run -d --name postgres \
  -e POSTGRES_DB=music_streaming \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password123 \
  -p 5432:5432 postgres:15
```

### Available Scripts

```bash
# Start all services
npm run dev

# Build all containers
npm run build

# Stop all services
npm run stop

# View logs
npm run logs
```

## 🚢 Deployment

### Production Deployment

1. **Environment Setup**:
   - Set production environment variables
   - Use AWS RDS for database
   - Configure domain and SSL

2. **AWS Resources**:
   ```bash
   # Run AWS setup for production
   AWS_REGION=us-west-2 ./scripts/setup-aws.sh
   ```

3. **Docker Deployment**:
   ```bash
   # Production build
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

### Security Considerations

- Use strong JWT secrets in production
- Enable HTTPS with SSL certificates
- Implement rate limiting
- Regular security updates
- AWS IAM best practices

## 🔍 Monitoring & Health Checks

- **Health Endpoint**: `/health`
- **Application Logs**: Available via Docker logs
- **AWS CloudWatch**: For S3 and RDS monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **AWS Credentials**: Ensure AWS credentials are properly configured
2. **CORS Errors**: Check S3 bucket CORS configuration
3. **Database Connection**: Verify PostgreSQL is running and accessible
4. **File Upload**: Check S3 permissions and bucket policy

### Getting Help

- Check Docker logs: `docker-compose logs [service-name]`
- Verify environment variables are set correctly
- Ensure AWS services are properly configured

## 🎯 Future Enhancements

- Playlist management
- Social features (following, sharing)
- Advanced search filters
- Music recommendations
- Mobile app development
- Audio processing and transcoding
- Real-time notifications

---

**Built with ❤️ using Docker, AWS, React, and Node.js**