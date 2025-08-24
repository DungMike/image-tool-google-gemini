# Start Docker Desktop and check status script

Write-Host "🐳 Docker Desktop Status Check" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue

# Check if Docker Desktop is running
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker Desktop is running!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🚀 You can now run:" -ForegroundColor Yellow
        Write-Host "   .\docker-build.ps1" -ForegroundColor White
        Write-Host "   docker-compose up -d" -ForegroundColor White
        Write-Host "   docker build -t image-tool:latest ." -ForegroundColor White
        exit 0
    }
} catch {
    Write-Host "❌ Docker Desktop is not running" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔧 Docker Desktop Status:" -ForegroundColor Yellow

# Check if Docker Desktop process is running
$dockerProcesses = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
if ($dockerProcesses) {
    Write-Host "   Docker Desktop process found but not responding" -ForegroundColor Yellow
} else {
    Write-Host "   Docker Desktop process not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 To start Docker Desktop:" -ForegroundColor Blue
Write-Host "   1. Open Docker Desktop application" -ForegroundColor White
Write-Host "   2. Wait for it to fully start (you'll see the whale icon in system tray)" -ForegroundColor White
Write-Host "   3. Run this script again to verify" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Alternative ways to start Docker Desktop:" -ForegroundColor Blue
Write-Host "   - Search 'Docker Desktop' in Start Menu" -ForegroundColor White
Write-Host "   - Look for Docker Desktop icon in system tray" -ForegroundColor White
Write-Host "   - Check if it's set to auto-start with Windows" -ForegroundColor White

Write-Host ""
Write-Host "⏳ Waiting for Docker Desktop to start..." -ForegroundColor Yellow
Write-Host "   (Press Ctrl+C to stop waiting)" -ForegroundColor Gray

# Wait for Docker to become available
$maxAttempts = 30
$attempt = 0

while ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 2
    $attempt++
    
    try {
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "🎉 Docker Desktop is now running!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🚀 You can now run:" -ForegroundColor Yellow
            Write-Host "   .\docker-build.ps1" -ForegroundColor White
            Write-Host "   docker-compose up -d" -ForegroundColor White
            break
        }
    } catch {
        # Continue waiting
    }
    
    Write-Host "   Attempt $attempt/$maxAttempts - Waiting..." -ForegroundColor Gray
}

if ($attempt -ge $maxAttempts) {
    Write-Host ""
    Write-Host "⏰ Timeout waiting for Docker Desktop" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop manually and try again" -ForegroundColor Yellow
}
