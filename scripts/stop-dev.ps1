$ErrorActionPreference = "SilentlyContinue"

$ports = @(3971, 5179)
$processIds = @()

foreach ($port in $ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  foreach ($connection in $connections) {
    if ($connection.OwningProcess -and $connection.OwningProcess -ne 0) {
      $processIds += $connection.OwningProcess
    }
  }
}

$processIds = $processIds | Sort-Object -Unique

if ($processIds.Count -eq 0) {
  Write-Host "No Kaze dev server processes found on ports $($ports -join ', ')."
  exit 0
}

foreach ($processId in $processIds) {
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($process) {
    Write-Host "Stopping process $processId ($($process.ProcessName))..."
    Stop-Process -Id $processId -Force
  }
}

Write-Host "Stopped Kaze dev server processes on ports $($ports -join ', ')."
