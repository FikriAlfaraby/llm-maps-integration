# scripts/test.ps1
Write-Host "Running System Tests..." -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

$testsPassed = 0
$testsFailed = 0

# Test 1: Check Redis
Write-Host "`n[TEST] Checking Redis..." -ForegroundColor Yellow
try {
    $redis = redis-cli ping
    if ($redis -eq "PONG") {
        Write-Host "[PASS] Redis is running" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "[FAIL] Redis not responding" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "[FAIL] Redis not found" -ForegroundColor Red
    $testsFailed++
}

# Test 2: Check Ollama
Write-Host "`n[TEST] Checking Ollama..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get
    Write-Host "[PASS] Ollama is running" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "[FAIL] Ollama not responding" -ForegroundColor Red
    $testsFailed++
}

# Test 3: Check Backend Health
Write-Host "`n[TEST] Checking Backend API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get
    if ($response.status -eq "healthy") {
        Write-Host "[PASS] Backend API is healthy" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "[FAIL] Backend API unhealthy" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "[FAIL] Backend API not responding" -ForegroundColor Red
    $testsFailed++
}

# Test 4: Check Frontend
Write-Host "`n[TEST] Checking Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "[PASS] Frontend is running" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "[FAIL] Frontend returned error" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "[FAIL] Frontend not responding" -ForegroundColor Red
    $testsFailed++
}

# Test 5: Test API Query
Write-Host "`n[TEST] Testing API Query..." -ForegroundColor Yellow
try {
    $body = @{
        prompt = "Find coffee shops in Jakarta"
        max_results = 2
        use_cache = $false
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/query" `
        -Method Post `
        -Body $body `
        -ContentType "application/json"
    
    if ($response.llm_text -and $response.places) {
        Write-Host "[PASS] API query successful" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "[FAIL] API query incomplete response" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "[FAIL] API query failed: $_" -ForegroundColor Red
    $testsFailed++
}

# Summary
Write-Host "`n========================" -ForegroundColor Cyan
Write-Host "Test Results:" -ForegroundColor Cyan
Write-Host "Passed: $testsPassed" -ForegroundColor Green
Write-Host "Failed: $testsFailed" -ForegroundColor Red

if ($testsFailed -eq 0) {
    Write-Host "`nAll tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`nSome tests failed. Please check the logs." -ForegroundColor Red
    exit 1
}