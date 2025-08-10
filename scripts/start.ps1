# scripts/start.ps1
Write-Host "Starting LLM Maps Integration..." -ForegroundColor Cyan

# Start Redis if not running
$redis = docker ps | Select-String "redis"
if (!$redis) {
    Write-Host "Starting Redis..." -ForegroundColor Yellow
    docker start redis
}

# Start backend
Write-Host "Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# Wait for backend to start
Start-Sleep -Seconds 5

# Start frontend
Write-Host "Starting frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start"

Write-Host "`nApplication starting..." -ForegroundColor Green
Write-Host "Backend: http://localhost:5000" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White