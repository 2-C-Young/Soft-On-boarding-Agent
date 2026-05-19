# Soft On-boarding Agent - Dev Server Starter
# 이 스크립트는 백엔드(Spring Boot)와 프론트엔드(React/Vite)를 각각 새로운 PowerShell 창에서 실행합니다.

Write-Host "🚀 백엔드(Spring Boot) 서버를 시작하는 중..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\gradlew bootRun"

Write-Host "🚀 프론트엔드(React/Vite) 서버를 시작하는 중..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "✅ 두 서버가 각각 새 창에서 실행되었습니다! 로그는 각 터미널 창에서 확인하실 수 있습니다." -ForegroundColor Yellow
