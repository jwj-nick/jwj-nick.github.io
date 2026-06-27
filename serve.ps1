# serve.ps1 — 집 Wi-Fi에서 폰으로 보기 위한 로컬 서버
#
# 사용법:
#   C:\Nick\30_Apps\jwj-nick.github.io\serve.ps1   (우클릭 → PowerShell 실행, 또는 터미널에서)
# 종료: 이 창에서 Ctrl+C
#
# 폰(같은 Wi-Fi)에서 열기:  http://<표시되는 IP>:8000/ideas/
# 어디서나(인터넷):        https://jwj-nick.github.io/ideas/   (git push 후)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$port = 8000

# ── 현재 LAN IP 자동 감지 ──
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' } |
  Select-Object -First 1).IPAddress
if (-not $ip) { $ip = 'localhost' }

# ── 포트 점유 정리 ──
$busy = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
foreach ($c in $busy) { try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } catch {} }
Start-Sleep -Milliseconds 500

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host " 아이디어 탐색 — 로컬 서버" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host " 🖥  이 PC      :  http://localhost:$port/ideas/" -ForegroundColor White
Write-Host " 📱 폰(같은 Wi-Fi):  http://${ip}:$port/ideas/" -ForegroundColor Green
Write-Host ""
Write-Host " 종료: Ctrl+C" -ForegroundColor DarkGray
Write-Host ""
try { Set-Clipboard -Value "http://${ip}:$port/ideas/"; Write-Host " 📋 폰용 URL 클립보드 복사됨" -ForegroundColor DarkGray } catch {}
Write-Host ""

# ── http.server (0.0.0.0 바인딩 → 폰에서 LAN IP로 접속 가능) ──
Set-Location $root
$env:PYTHONIOENCODING = 'utf-8'
python -m http.server $port --bind 0.0.0.0
