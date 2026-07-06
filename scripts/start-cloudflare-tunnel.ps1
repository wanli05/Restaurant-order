# Run npm start in another terminal first. Keep this window open while testing.
# Copy the https://*.trycloudflare.com URL from cloudflared output (changes each run).
$ErrorActionPreference = "Stop"
$origin = "http://127.0.0.1:3001"

Write-Host "Checking $origin/health ..."
try {
    $response = Invoke-WebRequest -Uri "$origin/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -ne 200) {
        throw "HTTP $($response.StatusCode)"
    }
    Write-Host "OK: local server is up." -ForegroundColor Green
}
catch {
    Write-Host "FAILED: cannot reach local app (Invoke-WebRequest error)." -ForegroundColor Red
    Write-Host ("Detail: " + $_.Exception.Message)
    Write-Host ""
    $portTest = Test-NetConnection -ComputerName 127.0.0.1 -Port 3001 -WarningAction SilentlyContinue
    if (-not $portTest.TcpTestSucceeded) {
        Write-Host "Port 3001 is CLOSED on this PC." -ForegroundColor Yellow
        Write-Host "Fix: open another terminal, run:  cd path\to\Restaurant-order  then  npm start" -ForegroundColor Yellow
        Write-Host "Wait for: Server running on http://localhost:3001" -ForegroundColor Yellow
        Write-Host "Then open browser http://localhost:3001/health  (must show JSON with ok:true)." -ForegroundColor Yellow
    }
    else {
        Write-Host "Port 3001 is open but /health failed. Try http://127.0.0.1:3001/health in browser." -ForegroundColor Yellow
    }
    exit 1
}

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "FAILED: cloudflared not found in PATH. Install from Cloudflare docs." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting Quick Tunnel (HTTP/2)..." -ForegroundColor Cyan
Write-Host "Keep this window open. Copy the https URL from the log lines below." -ForegroundColor Cyan
Write-Host ""

& cloudflared tunnel --url $origin --protocol http2
