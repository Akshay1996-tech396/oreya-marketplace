Write-Host "Stopping Next.js server running on port 3000..." -ForegroundColor Yellow

$connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

foreach ($connection in $connections) {
  Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
}

Write-Host "Removing .next cache..." -ForegroundColor Yellow

Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

Write-Host "Checking TypeScript..." -ForegroundColor Yellow

npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
  Write-Host "TypeScript errors found. Fix them before starting the server." -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host "Starting Next.js development server..." -ForegroundColor Green

npx next dev --webpack