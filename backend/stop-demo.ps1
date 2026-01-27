Write-Host "Stopping Profitzen Services..." -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

$dotnetProcesses = Get-Process dotnet -ErrorAction SilentlyContinue
if ($dotnetProcesses) {
    Write-Host "Found $($dotnetProcesses.Count) dotnet process(es). Stopping..." -ForegroundColor Yellow
    $dotnetProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "All dotnet processes stopped successfully." -ForegroundColor Green
} else {
    Write-Host "No dotnet processes found." -ForegroundColor Green
}

Write-Host ""
Write-Host "All Profitzen services have been stopped." -ForegroundColor Green
