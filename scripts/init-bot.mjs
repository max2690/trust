#!/usr/bin/env node
// Скрипт для инициализации Telegram бота при старте сервера
// Вызывается через ExecStartPost в systemd

import('dotenv').then(dotenv => {
  dotenv.config({ path: '.env.local' })
  
  setTimeout(async () => {
    try {
      const response = await fetch('http://localhost:3000/api/health')
      const data = await response.json()
      console.log('✅ Health check вызван, бот должен инициализироваться:', data)
    } catch (err) {
      console.error('❌ Ошибка вызова health check:', err)
    }
  }, 3000) // Ждём 3 секунды после старта сервера
})

