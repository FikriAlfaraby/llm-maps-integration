Write-Host "================================" -ForegroundColor Cyan
Write-Host "LLM Maps Integration Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check prerequisites
Write-Host "`nChecking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "[✓] Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[✗] Node.js not found. Please install Node.js" -ForegroundColor Red
    exit 1
}

# Check Docker
try {
    $dockerVersion = docker --version
    Write-Host "[✓] Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "[✗] Docker not found. Please install Docker Desktop" -ForegroundColor Red
    exit 1
}

# Check for .env file
if (!(Test-Path ".env")) {
    Write-Host "[!] .env file not found. Creating from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "[!] Please edit .env file with your Google Maps API key" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "[✓] .env file found" -ForegroundColor Green
}

# Start Redis with Docker
Write-Host "`nStarting Redis..." -ForegroundColor Yellow
docker run --name redis -p 6379:6379 -d redis:alpine
Write-Host "[✓] Redis started" -ForegroundColor Green

# Install backend dependencies
Write-Host "`nInstalling backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
Set-Location ..
Write-Host "[✓] Backend dependencies installed" -ForegroundColor Green

# Install frontend dependencies
Write-Host "`nInstalling frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
Set-Location ..
Write-Host "[✓] Frontend dependencies installed" -ForegroundColor Green

# Start Ollama
Write-Host "`nStarting Ollama..." -ForegroundColor Yellow
Start-Process ollama serve
Start-Sleep -Seconds 3
ollama pull mistral:7b-instruct-q4_0
Write-Host "[✓] Ollama started and model downloaded" -ForegroundColor Green

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host "`nTo start the application:" -ForegroundColor Yellow
Write-Host "  1. Run: .\scripts\start.ps1" -ForegroundColor White
Write-Host "  2. Open: http://localhost:3000" -ForegroundColor White