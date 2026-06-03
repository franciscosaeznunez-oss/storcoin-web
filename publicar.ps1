param([string]$mensaje = "Actualizacion")
Set-Location "C:\Users\ALUMNO\Downloads\storcoin-web"
git add .
git commit -m $mensaje
git push
Write-Host ""
Write-Host "Publicado. storcoin.cl se actualiza en ~1 minuto..." -ForegroundColor Green
Start-Sleep -Seconds 65
Start-Process "https://storcoin.cl"
