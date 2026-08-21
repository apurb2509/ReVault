$ErrorActionPreference = "Stop"

Write-Host "Starting ReVault Go Microservices..." -ForegroundColor Cyan

# Define ports for the services
$env:PORT = "8080"; Start-Process -NoNewWindow -FilePath "C:\Progra~1\Go\bin\go.exe" -ArgumentList "run .\api-gateway\main.go"
Write-Host "Started API Gateway on :8080" -ForegroundColor Green

$env:PORT = "8081"; Start-Process -NoNewWindow -FilePath "C:\Progra~1\Go\bin\go.exe" -ArgumentList "run .\notification-svc\main.go"
Write-Host "Started Notification Service on :8081" -ForegroundColor Green

$env:PORT = "8082"; Start-Process -NoNewWindow -FilePath "C:\Progra~1\Go\bin\go.exe" -ArgumentList "run .\payment-link-svc\main.go"
Write-Host "Started Payment Link Service on :8082" -ForegroundColor Green

$env:PORT = "8083"; Start-Process -NoNewWindow -FilePath "C:\Progra~1\Go\bin\go.exe" -ArgumentList "run .\audit-svc\main.go"
Write-Host "Started Audit Service on :8083" -ForegroundColor Green

$env:PORT = "8084"; Start-Process -NoNewWindow -FilePath "C:\Progra~1\Go\bin\go.exe" -ArgumentList "run .\scheduler-svc\main.go"
Write-Host "Started Scheduler Service on :8084" -ForegroundColor Green

$env:PORT = "8085"; Start-Process -NoNewWindow -FilePath "C:\Progra~1\Go\bin\go.exe" -ArgumentList "run .\agent-svc\main.go"
Write-Host "Started Agent Service on :8085" -ForegroundColor Green

Write-Host "All services started." -ForegroundColor Cyan
