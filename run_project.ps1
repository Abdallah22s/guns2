$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

Write-Host "Stopping old project processes..."
$pythonProcs = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq "python.exe" -and ($_.CommandLine -match "app.py" -or $_.CommandLine -match "webhook_sample/webhook_consumer.py")
}
$pythonProcs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

$nodeProcs = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq "node.exe" -and $_.CommandLine -match "train\\guns_final\\guns2\\frontend"
}
$nodeProcs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Write-Host "Starting backend (Flask) on :5000 ..."
Start-Process -FilePath python -ArgumentList "app.py" -WorkingDirectory $PSScriptRoot -RedirectStandardOutput "backend.out.log" -RedirectStandardError "backend.err.log" | Out-Null

Write-Host "Starting webhook/socket on :5001 ..."
Start-Process -FilePath python -ArgumentList "webhook_sample/webhook_consumer.py" -WorkingDirectory $PSScriptRoot -RedirectStandardOutput "webhook.out.log" -RedirectStandardError "webhook.err.log" | Out-Null

Write-Host "Starting frontend (Next.js) on :3000 with Node 20 ..."
$frontendDir = Join-Path $PSScriptRoot "frontend"
Start-Process -FilePath cmd.exe -ArgumentList "/c", "npx -y node@20 node_modules/next/dist/bin/next dev -H 127.0.0.1 -p 3000" -WorkingDirectory $frontendDir -RedirectStandardOutput "frontend.out.log" -RedirectStandardError "frontend.err.log" | Out-Null

Start-Sleep -Seconds 4

Write-Host ""
Write-Host "Project started:"
Write-Host "Frontend: http://127.0.0.1:3000"
Write-Host "Backend : http://127.0.0.1:5000/api"
Write-Host "Webhook : http://127.0.0.1:5001"
