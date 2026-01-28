#!/usr/bin/env node
// Кастомный запуск Next.js с гарантированной инициализацией Telegram бота

require('dotenv').config({ path: '.env.local' })

// Сначала инициализируем бота
if (process.env.TELEGRAM_BOT_TOKEN) {
  console.log('🤖 Предзапуск: Инициализация Telegram бота...')
  try {
    require('./dist/lib/telegram-init-server.js')
    console.log('✅ Предзапуск: Telegram init-server импортирован')
  } catch (err) {
    console.error('⚠️ Ошибка импорта bot-launcher:', err.message)
    // Пробуем альтернативный путь
    try {
      const { initializeTelegramBot } = require('./.next/server/chunks/telegram-init')
      initializeTelegramBot()
    } catch (e2) {
      console.error('❌ Не удалось инициализировать бота при предзапуске')
    }
  }
}

// Затем запускаем Next.js
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const port = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // После подготовки вызываем health check для запуска бота через API
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${port}`)
    
    // Вызываем health check через 2 секунды после старта
    setTimeout(() => {
      const http = require('http')
      http.get(`http://localhost:${port}/api/health`, (res) => {
        console.log('✅ Health check вызван для инициализации бота')
      }).on('error', (e) => {
        console.error('⚠️ Ошибка health check:', e.message)
      })
    }, 2000)
  })
})

