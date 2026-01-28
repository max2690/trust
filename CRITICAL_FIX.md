# КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ — Telegram бот не инициализируется

## 🔴 ПРОБЛЕМА

Бот НЕ запускается при старте сервера в продакшне, потому что:

1. Динамический `import()` в `layout.tsx` не выполняется синхронно
2. Next.js в продакшне компилирует layout один раз, асинхронный импорт может не сработать
3. В логах нет "🤖 Инициализация Telegram бота..." → бот не работает

## ✅ РЕШЕНИЕ

### Вариант 1: Через systemd ExecStartPost (РЕКОМЕНДУЕТСЯ)

Обновите `/etc/systemd/system/mb-trust.service`:

```ini
[Unit]
Description=MB Trust Next.js App
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/mb-trust
EnvironmentFile=/var/www/mb-trust/.env.local
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start -- -p 3000
ExecStartPost=/bin/sleep 3 && /usr/bin/curl -s http://localhost:3000/api/health
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Затем:
```bash
sudo systemctl daemon-reload
sudo systemctl restart mb-trust
journalctl -u mb-trust -f
```

### Вариант 2: Кастомный сервер (server-start.js)

Файл уже создан: `server-start.js`

Обновите systemd unit:
```ini
ExecStart=/usr/bin/node /var/www/mb-trust/server-start.js
```

Затем:
```bash
sudo systemctl daemon-reload
sudo systemctl restart mb-trust
```

### Вариант 3: Скрипт в package.json

Добавьте в `package.json`:
```json
{
  "scripts": {
    "start:bot": "node -e \"require('dotenv').config({path:'.env.local'}); setTimeout(()=>require('http').get('http://localhost:3000/api/health'),2000)\" &",
    "start:prod": "npm run start:bot && npm start"
  }
}
```

В systemd:
```ini
ExecStart=/usr/bin/npm run start:prod
```

---

## 🧪 БЫСТРАЯ ПРОВЕРКА

```bash
# 1. Перезапустите сервис
sudo systemctl restart mb-trust

# 2. Сразу проверьте логи
journalctl -u mb-trust -f

# 3. Через 3 секунды вызовите health check вручную
sleep 3 && curl http://localhost:3000/api/health

# 4. Проверьте, что бот запустился
journalctl -u mb-trust | grep -E "🤖|Telegram бот"
```

**ДОЛЖНЫ УВИДЕТЬ:**
```
🤖 Запуск Telegram бота...
✅ Telegram бот успешно запущен
```

**Если НЕТ** → бот не работает, регистрация не завершится!

---

## 📊 ТЕКУЩИЙ СТАТУС

### ❌ НЕ РАБОТАЕТ:
- Бот не инициализируется автоматически при старте
- Динамический импорт в layout.tsx не срабатывает в продакшне

### ✅ РАБОТАЕТ:
- Генерация кодов (видно в логах: `[VERIFY-START] Сгенерирован код: 13F9BC`)
- API endpoints работают
- OpenAI промпты правильные
- Fallback-парсер добавлен
- Логирование полное

### 🔧 НУЖНО ИСПРАВИТЬ:
1. Гарантированная инициализация бота через systemd ExecStartPost
2. Или использовать `server-start.js`

---

## 🎯 ФИНАЛЬНАЯ ИНСТРУКЦИЯ

### Вариант 1 (самый простой):

```bash
# 1. Обновить systemd unit
sudo nano /etc/systemd/system/mb-trust.service

# Добавить строку после ExecStart:
# ExecStartPost=/bin/sleep 3 && /usr/bin/curl -s http://localhost:3000/api/health

# 2. Перезагрузить systemd
sudo systemctl daemon-reload
sudo systemctl restart mb-trust

# 3. Проверить логи
journalctl -u mb-trust -f
```

### Вариант 2 (через cron):

Добавьте в crontab:
```bash
@reboot sleep 10 && curl http://109.69.58.185:3000/api/health
```

---

## 🔍 ЧТО ПРОВЕРИТЬ ПРЯМО СЕЙЧАС

```bash
# 1. Бот НЕ запущен сейчас
journalctl -u mb-trust | grep "Telegram бот успешно запущен"
# Если пусто → бот не работает!

# 2. Запустить бота вручную ПРЯМО СЕЙЧАС
curl http://localhost:3000/api/health

# 3. Проверить логи СРАЗУ
journalctl -u mb-trust -n 20

# 4. Теперь попробовать регистрацию
# Должно заработать!
```

**БЕЗ ЗАПУЩЕННОГО БОТА РЕГИСТРАЦИЯ НЕ ЗАВЕРШИТСЯ!**

