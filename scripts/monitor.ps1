# scripts/monitor.ps1
Write-Host "Monitoring LLM Maps Integration Services" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to exit" -ForegroundColor Yellow
Write-Host ""

while ($true) {
    Clear-Host
    Write-Host "=== Service Status ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Check Redis
    Write-Host -NoNewline "Redis: "
    try {
        $redis = redis-cli ping 2>$null
        if ($redis -eq "PONG") {
            Write-Host "✓ Running" -ForegroundColor Green
        } else {
            Write-Host "✗ Down" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Down" -ForegroundColor Red
    }
    
    # Check Ollama
    Write-Host -NoNewline "Ollama: "
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -ErrorAction SilentlyContinue
        Write-Host "✓ Running" -ForegroundColor Green
    } catch {
        Write-Host "✗ Down" -ForegroundColor Red
    }
    
    # Check Backend
    Write-Host -NoNewline "Backend: "
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get -ErrorAction SilentlyContinue
        Write-Host "✓ Running" -ForegroundColor Green
    } catch {
        Write-Host "✗ Down" -ForegroundColor Red
    }
    
    # Check Frontend
    Write-Host -NoNewline "Frontend: "
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -ErrorAction SilentlyContinue
        Write-Host "✓ Running" -ForegroundColor Green
    } catch {
        Write-Host "✗ Down" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "=== Resource Usage ===" -ForegroundColor Cyan
    
    # Show Docker stats if available
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        docker stats --no-stream --format "table {{.Container}}`t{{.CPUPerc}}`t{{.MemUsage}}"
    }
    
    Start-Sleep -Seconds 5
}