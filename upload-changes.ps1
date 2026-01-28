# Автоматическая загрузка измененных файлов через SFTP
# Использует .NET классы для SFTP соединения

param(
    [string]$Hostname = "109.69.58.185",
    [string]$Username = "root",
    [string]$Password = "99RFG9J7AhjP",
    [int]$Port = 22,
    [string]$RemotePath = "/var/www/mb-trust"
)

# Файлы для загрузки
$filesToUpload = @(
    "src/components/header.tsx",
    "src/app/api/users/route.ts",
    "src/app/dashboard/customer/page.tsx",
    "src/app/customer/dashboard/page.tsx"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Загрузка файлов через SFTP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Проверяем наличие файлов
$missingFiles = @()
foreach ($file in $filesToUpload) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "ОШИБКА: Следующие файлы не найдены:" -ForegroundColor Red
    foreach ($file in $missingFiles) {
        Write-Host "  - $file" -ForegroundColor Red
    }
    exit 1
}

# Пробуем использовать SSH.NET через NuGet пакет
try {
    Write-Host "Попытка загрузки через SSH.NET..." -ForegroundColor Yellow
    
    # Проверяем наличие SSH.NET
    $sshNetPath = Join-Path $PSScriptRoot "packages\Renci.SshNet.1.3.0\lib\net40\Renci.SshNet.dll"
    
    if (-not (Test-Path $sshNetPath)) {
        Write-Host "SSH.NET не найден. Устанавливаю через NuGet..." -ForegroundColor Yellow
        
        # Скачиваем SSH.NET DLL напрямую
        $dllUrl = "https://www.nuget.org/api/v2/package/Renci.SshNet/1.3.0"
        $tempZip = Join-Path $env:TEMP "SSH.NET.zip"
        
        try {
            Invoke-WebRequest -Uri $dllUrl -OutFile $tempZip -UseBasicParsing
            Expand-Archive -Path $tempZip -DestinationPath (Join-Path $env:TEMP "SSH.NET") -Force
            $sshNetPath = Get-ChildItem -Path (Join-Path $env:TEMP "SSH.NET") -Filter "Renci.SshNet.dll" -Recurse | Select-Object -First 1 -ExpandProperty FullName
        } catch {
            Write-Host "Не удалось скачать SSH.NET автоматически." -ForegroundColor Red
            Write-Host "Используйте расширение SFTP в VS Code для загрузки файлов." -ForegroundColor Yellow
            exit 1
        }
    }
    
    Add-Type -Path $sshNetPath
    
    # Создаем соединение
    $authMethod = New-Object Renci.SshNet.PasswordAuthenticationMethod($Username, $Password)
    $connectionInfo = New-Object Renci.SshNet.ConnectionInfo($Hostname, $Port, $Username, $authMethod)
    
    $sftp = New-Object Renci.SshNet.SftpClient($connectionInfo)
    
    Write-Host "Подключение к $Hostname`:$Port..." -ForegroundColor Cyan
    $sftp.Connect()
    
    if ($sftp.IsConnected) {
        Write-Host "Подключение установлено!" -ForegroundColor Green
        
        foreach ($file in $filesToUpload) {
            $localFile = Resolve-Path $file
            $remoteFile = "$RemotePath/$file"
            
            # Создаем директории если нужно
            $remoteDir = Split-Path $remoteFile -Parent
            $dirs = $remoteDir -split '/'
            $currentPath = ""
            foreach ($dir in $dirs) {
                if ($dir) {
                    $currentPath += "/$dir"
                    if (-not $sftp.Exists($currentPath)) {
                        $sftp.CreateDirectory($currentPath)
                    }
                }
            }
            
            Write-Host "Загружаю: $file" -ForegroundColor Yellow
            Write-Host "  -> $remoteFile" -ForegroundColor Gray
            
            $fileStream = [System.IO.File]::OpenRead($localFile)
            $sftp.UploadFile($fileStream, $remoteFile)
            $fileStream.Close()
            
            Write-Host "  ✓ Успешно загружен" -ForegroundColor Green
        }
        
        $sftp.Disconnect()
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  Все файлы успешно загружены!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        
    } else {
        Write-Host "ОШИБКА: Не удалось подключиться к серверу" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host ""
    Write-Host "ОШИБКА при загрузке через SSH.NET:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "АЛЬТЕРНАТИВНЫЙ СПОСОБ:" -ForegroundColor Yellow
    Write-Host "Используйте расширение SFTP в VS Code:" -ForegroundColor Yellow
    Write-Host "1. Откройте Command Palette (Ctrl+Shift+P)" -ForegroundColor Cyan
    Write-Host "2. Выполните: 'SFTP: Upload File' или 'SFTP: Upload Folder'" -ForegroundColor Cyan
    Write-Host "3. Выберите файлы для загрузки" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Или используйте созданный файл upload-files-sftp.txt с WinSCP" -ForegroundColor Yellow
    exit 1
}

