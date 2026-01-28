# SFTP Upload Script для MB-TRUST
# Использует встроенные возможности PowerShell для SFTP

$hostname = "109.69.58.185"
$username = "root"
$password = "99RFG9J7AhjP"
$port = 22
$remotePath = "/var/www/mb-trust"

# Файлы для загрузки
$files = @(
    "src/components/header.tsx",
    "src/app/api/users/route.ts",
    "src/app/dashboard/customer/page.tsx",
    "src/app/customer/dashboard/page.tsx"
)

Write-Host "Начинаю загрузку файлов через SFTP..." -ForegroundColor Green

# Используем WinSCP .NET assembly если доступен, иначе используем SSH.NET
try {
    # Попытка использовать WinSCP
    $winscpPath = "C:\Program Files (x86)\WinSCP\WinSCP.exe"
    if (Test-Path $winscpPath) {
        Write-Host "Используется WinSCP..." -ForegroundColor Yellow
        
        # Создаем временный скрипт для WinSCP
        $winscpScript = @"
option batch abort
option confirm off
open sftp://$username`:$password@$hostname`:$port
cd $remotePath
"@
        
        foreach ($file in $files) {
            $winscpScript += "`nput `"$file`" `"$remotePath/$file`""
        }
        
        $winscpScript += "`nclose`nexit"
        
        $scriptFile = "winscp-script.txt"
        $winscpScript | Out-File -FilePath $scriptFile -Encoding ASCII
        
        & $winscpPath /script=$scriptFile
        
        Remove-Item $scriptFile
        Write-Host "Файлы успешно загружены!" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host "WinSCP не найден, пробую альтернативный метод..." -ForegroundColor Yellow
}

# Альтернативный метод через Posh-SSH (если установлен)
try {
    Import-Module Posh-SSH -ErrorAction Stop
    
    $securePassword = ConvertTo-SecureString $password -AsPlainText -Force
    $credential = New-Object System.Management.Automation.PSCredential($username, $securePassword)
    
    $session = New-SFTPSession -ComputerName $hostname -Port $port -Credential $credential
    
    foreach ($file in $files) {
        if (Test-Path $file) {
            $remoteFile = "$remotePath/$file"
            Write-Host "Загружаю: $file -> $remoteFile" -ForegroundColor Cyan
            Set-SFTPFile -SessionId $session.SessionId -LocalFile $file -RemotePath $remoteFile
        } else {
            Write-Host "Файл не найден: $file" -ForegroundColor Red
        }
    }
    
    Remove-SFTPSession -SessionId $session.SessionId
    Write-Host "Файлы успешно загружены!" -ForegroundColor Green
    
} catch {
    Write-Host "Posh-SSH не установлен. Используйте расширение SFTP в VS Code или установите Posh-SSH:" -ForegroundColor Yellow
    Write-Host "Install-Module -Name Posh-SSH -Force" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Или используйте расширение SFTP в VS Code для ручной загрузки файлов." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Файлы для загрузки:" -ForegroundColor Green
    foreach ($file in $files) {
        Write-Host "  - $file" -ForegroundColor White
    }
}

