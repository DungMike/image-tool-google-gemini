# Docker build and run script for Image Tool (PowerShell)

param(
    [switch]$Dev,
    [switch]$Stop,
    [switch]$Logs
)

Write-Host "🐳 Building and running Image Tool with Docker..." -ForegroundColor Blue

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Error "Docker is not running. Please start Docker and try again."
    exit 1
}

# Stop and remove existing containers if requested
if ($Stop) {
    Write-Status "Stopping and removing existing containers..."
    docker stop image-tool-app 2>$null
    docker rm image-tool-app 2>$null
    docker stop image-tool-dev 2>$null
    docker rm image-tool-dev 2>$null
    Write-Success "Containers stopped and removed!"
    exit 0
}

# Show logs if requested
if ($Logs) {
    Write-Status "Showing container logs..."
    docker logs image-tool-app
    exit 0
}

# Development mode
if ($Dev) {
    Write-Status "Starting development container..."
    
    # Stop existing dev container
    docker stop image-tool-dev 2>$null
    docker rm image-tool-dev 2>$null
    
    # Build and run dev container
    docker build -f Dockerfile.dev -t image-tool:dev .
    docker run -d `
        --name image-tool-dev `
        -p 3000:3000 `
        -v ${PWD}:/app `
        -v /app/node_modules `
        image-tool:dev
    
    Write-Success "Development container started!"
    Write-Host ""
    Write-Host "🌐 Development server is running at: http://localhost:3000" -ForegroundColor Green
    Write-Host "📋 Container logs:" -ForegroundColor Yellow
    docker logs image-tool-dev
    exit 0
}

# Production mode (default)
Write-Status "Building production Docker image..."
docker build -t image-tool:latest .

if ($LASTEXITCODE -eq 0) {
    Write-Success "Docker image built successfully!"
} else {
    Write-Error "Failed to build Docker image"
    exit 1
}

# Stop and remove existing containers
Write-Status "Stopping existing containers..."
docker stop image-tool-app 2>$null
docker rm image-tool-app 2>$null

# Run the production container
Write-Status "Starting production container..."
docker run -d `
    --name image-tool-app `
    -p 8080:80 `
    --restart unless-stopped `
    image-tool:latest

if ($LASTEXITCODE -eq 0) {
    Write-Success "Container started successfully!"
    Write-Host ""
    Write-Host "🌐 Application is running at: http://localhost:8080" -ForegroundColor Green
    Write-Host "🔍 Health check: http://localhost:8080/health" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Container logs:" -ForegroundColor Yellow
    docker logs image-tool-app
} else {
    Write-Error "Failed to start container"
    exit 1
}

Write-Host ""
Write-Success "Docker setup complete!"
