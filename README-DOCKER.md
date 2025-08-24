# 🐳 Docker Quick Start Guide

## 🚀 Quick Commands

### 1. Check Docker Status
```powershell
.\start-docker.ps1
```

### 2. Build and Run Production
```powershell
.\docker-build.ps1
```
**Access:** http://localhost:8080

### 3. Build and Run Development
```powershell
.\docker-build.ps1 -Dev
```
**Access:** http://localhost:3000

### 4. Using Docker Compose
```bash
# Production
docker-compose up -d

# Development
docker-compose --profile dev up -d

# Stop
docker-compose down
```

## 📁 Files Created

- `Dockerfile` - Production build
- `Dockerfile.dev` - Development build  
- `docker-compose.yml` - Multi-service setup
- `nginx.conf` - Web server configuration
- `.dockerignore` - Build exclusions
- `docker-build.ps1` - Windows PowerShell script
- `docker-build.sh` - Linux/Mac script
- `start-docker.ps1` - Docker status checker

## 🔧 Manual Docker Commands

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

## 🌐 URLs

- **Production**: http://localhost:8080
- **Development**: http://localhost:3000
- **Health Check**: http://localhost:8080/health

## 📋 Prerequisites

1. **Install Docker Desktop** from [docker.com](https://www.docker.com/products/docker-desktop/)
2. **Start Docker Desktop** and wait for it to fully load
3. **Run status check**: `.\start-docker.ps1`

## 🐛 Troubleshooting

### Docker not running
```powershell
.\start-docker.ps1
```

### Port conflicts
```bash
# Use different port
docker run -d --name image-tool-app -p 8081:80 image-tool:latest
```

### View logs
```bash
docker logs image-tool-app
docker logs image-tool-dev
```

### Stop containers
```bash
docker stop image-tool-app image-tool-dev
docker rm image-tool-app image-tool-dev
```

## 📚 Full Documentation

See `DOCKER.md` for complete documentation including:
- Detailed configuration
- Performance optimization
- Security features
- Deployment guides
- Monitoring and troubleshooting
