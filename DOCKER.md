# 🐳 Docker Setup for Image Tool

This document explains how to run the Image Tool application using Docker.

## 📋 Prerequisites

- Docker Desktop installed and running
- Git (for cloning the repository)

## 🚀 Quick Start

### Option 1: Using PowerShell Script (Windows)

```powershell
# Build and run production version
.\docker-build.ps1

# Build and run development version
.\docker-build.ps1 -Dev

# Stop containers
.\docker-build.ps1 -Stop

# Show logs
.\docker-build.ps1 -Logs
```

### Option 2: Using Docker Compose

```bash
# Production build
docker-compose up -d

# Development build
docker-compose --profile dev up -d

# Stop all services
docker-compose down
```

### Option 3: Manual Docker Commands

```bash
# Build production image
docker build -t image-tool:latest .

# Run production container
docker run -d --name image-tool-app -p 8080:80 image-tool:latest

# Build development image
docker build -f Dockerfile.dev -t image-tool:dev .

# Run development container
docker run -d --name image-tool-dev -p 3000:80 -v $(pwd):/app image-tool:dev
```

## 🌐 Access URLs

- **Production**: http://localhost:8080
- **Development**: http://localhost:3000
- **Health Check**: http://localhost:8080/health

## 📁 File Structure

```
├── Dockerfile              # Production build
├── Dockerfile.dev          # Development build
├── docker-compose.yml      # Multi-service orchestration
├── nginx.conf             # Nginx configuration
├── .dockerignore          # Docker build exclusions
├── docker-build.sh        # Linux/Mac build script
└── docker-build.ps1       # Windows PowerShell script
```

## 🔧 Configuration

### Nginx Configuration (`nginx.conf`)

- **Port**: 80 (internal), 8080 (external)
- **Gzip compression**: Enabled
- **Security headers**: XSS protection, frame options
- **SPA routing**: Handles React Router
- **Static asset caching**: Optimized for performance

### Environment Variables

The application uses environment variables for configuration. Create a `.env` file:

```env
VITE_GEMINI_API_KEY_1=your_api_key_here
VITE_GEMINI_API_KEY_2=your_second_api_key_here
VITE_CONCURRENT_REQUESTS=5
VITE_RATE_LIMIT_PER_MINUTE=10
VITE_RATE_LIMIT_PER_DAY=100
```

## 🧪 Testing

### Health Check

```bash
curl http://localhost:8080/health
# Expected: "healthy"
```

### Container Status

```bash
# Check running containers
docker ps

# Check container logs
docker logs image-tool-app

# Check container resources
docker stats image-tool-app
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using the port
   netstat -ano | findstr :8080
   
   # Stop the container and use different port
   docker run -d --name image-tool-app -p 8081:80 image-tool:latest
   ```

2. **Build fails**
   ```bash
   # Clean Docker cache
   docker system prune -a
   
   # Rebuild without cache
   docker build --no-cache -t image-tool:latest .
   ```

3. **Container won't start**
   ```bash
   # Check container logs
   docker logs image-tool-app
   
   # Check container status
   docker inspect image-tool-app
   ```

### Development Mode Issues

1. **Hot reload not working**
   - Ensure volume mount is correct
   - Check file permissions
   - Restart container

2. **Node modules issues**
   ```bash
   # Rebuild dev container
   docker-compose --profile dev down
   docker-compose --profile dev up --build
   ```

## 📊 Performance

### Production Build

- **Multi-stage build**: Reduces final image size
- **Nginx**: High-performance web server
- **Gzip compression**: Reduces bandwidth usage
- **Asset caching**: Optimized for static files

### Development Build

- **Volume mounting**: Real-time code changes
- **Hot reload**: Instant feedback during development
- **Node.js**: Full development environment

## 🔒 Security

- **Security headers**: XSS protection, frame options
- **Non-root user**: Nginx runs as non-root
- **Minimal base image**: Alpine Linux for smaller attack surface
- **Health checks**: Container monitoring

## 📈 Monitoring

### Container Metrics

```bash
# Real-time container stats
docker stats image-tool-app

# Container resource usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### Logs

```bash
# Follow logs in real-time
docker logs -f image-tool-app

# Show last 100 lines
docker logs --tail 100 image-tool-app
```

## 🚀 Deployment

### Production Deployment

```bash
# Build and tag for registry
docker build -t your-registry/image-tool:latest .

# Push to registry
docker push your-registry/image-tool:latest

# Deploy to production
docker run -d --name image-tool-prod -p 80:80 your-registry/image-tool:latest
```

### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml image-tool
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [React Build Optimization](https://create-react-app.dev/docs/production-build/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
