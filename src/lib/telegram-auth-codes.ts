// Временное хранилище для кодов авторизации через Telegram
// В продакшене лучше использовать Redis

interface AuthCodeData {
  code: string;
  createdAt: number;
  telegramId?: string;
  authorized?: boolean;
}

const authCodes = new Map<string, AuthCodeData>()

// Очистка старых кодов (старше 10 минут)
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  let cleaned = 0
  
  for (const [tempUserId, data] of authCodes.entries()) {
    if (now - data.createdAt > 10 * 60 * 1000) {
      authCodes.delete(tempUserId)
      cleaned++
    }
  }
  
  if (cleaned > 0) {
    console.log(`[AUTH CODES] Очищено старых кодов: ${cleaned}`)
  }
}, 60 * 1000) // Каждую минуту

// Предотвращаем утечку памяти при hot reload
if (process.env.NODE_ENV === 'development') {
  if (global.authCodesCleanup) {
    clearInterval(global.authCodesCleanup)
  }
  global.authCodesCleanup = cleanupInterval
}

export function getAuthCode(tempUserId: string): AuthCodeData | undefined {
  return authCodes.get(tempUserId)
}

export function setAuthCode(tempUserId: string, data: AuthCodeData): void {
  authCodes.set(tempUserId, data)
}

export function markAsAuthorized(tempUserId: string, telegramId: string): void {
  const data = authCodes.get(tempUserId)
  if (data) {
    data.telegramId = telegramId
    data.authorized = true
    authCodes.set(tempUserId, data)
  }
}

export function findByCode(code: string): string | null {
  const normalizedCode = code.toUpperCase().trim()
  
  for (const [tempUserId, data] of authCodes.entries()) {
    if (data.code.toUpperCase() === normalizedCode) {
      return tempUserId
    }
  }
  
  return null
}

// Расширение глобального объекта для предотвращения утечки памяти
declare global {
  // eslint-disable-next-line no-var
  var authCodesCleanup: NodeJS.Timeout | undefined
}

