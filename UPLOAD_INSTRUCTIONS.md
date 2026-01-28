# 📤 Инструкция по загрузке файлов через SFTP

## Автоматическая загрузка через расширение SFTP в VS Code

### Шаг 1: Проверьте конфигурацию
Конфигурация SFTP уже создана в `.vscode/sftp.json`

### Шаг 2: Загрузите файлы

#### Вариант A: Через Command Palette (Рекомендуется)
1. Откройте **Command Palette** (`Ctrl+Shift+P` или `F1`)
2. Введите: `SFTP: Upload File`
3. Выберите файлы для загрузки:
   - `src/components/header.tsx`
   - `src/app/api/users/route.ts`
   - `src/app/dashboard/customer/page.tsx`
   - `src/app/customer/dashboard/page.tsx`

#### Вариант B: Через контекстное меню
1. Откройте файл в редакторе
2. Правой кнопкой мыши → **SFTP: Upload File**
3. Повторите для каждого файла

#### Вариант C: Загрузить все измененные файлы
1. Command Palette → `SFTP: Upload Changed Files`
2. Или Command Palette → `SFTP: Upload Folder` → выберите `src/`

### Файлы для загрузки:
- ✅ `src/components/header.tsx`
- ✅ `src/app/api/users/route.ts`
- ✅ `src/app/dashboard/customer/page.tsx`
- ✅ `src/app/customer/dashboard/page.tsx`

### Параметры подключения:
- **Host:** 109.69.58.185
- **Port:** 22
- **Username:** root
- **Remote Path:** /var/www/mb-trust

---

## Альтернативный способ: WinSCP

Если у вас установлен WinSCP, используйте файл `upload-files-sftp.txt`:

```bash
winscp.exe /script=upload-files-sftp.txt
```

---

## Проверка загрузки

После загрузки проверьте файлы на сервере:
```bash
ssh root@109.69.58.185
cd /var/www/mb-trust
ls -la src/components/header.tsx
ls -la src/app/api/users/route.ts
ls -la src/app/dashboard/customer/page.tsx
ls -la src/app/customer/dashboard/page.tsx
```

