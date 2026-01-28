/**
 * Утилиты для работы с URL
 */

/**
 * Проверяет валидность URL
 */
export function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Нормализует URL, добавляя https:// если отсутствует протокол
 */
export function normalizeUrl(urlString: string): string {
  if (!urlString) return '';
  
  const trimmed = urlString.trim();
  
  // Если URL уже имеет протокол, возвращаем как есть
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  
  // Добавляем https:// по умолчанию
  return `https://${trimmed}`;
}

/**
 * Валидирует и нормализует URL
 * Возвращает объект с нормализованным URL и статусом валидности
 */
export function validateAndNormalizeUrl(urlString: string): {
  normalized: string;
  isValid: boolean;
  error?: string;
} {
  if (!urlString || !urlString.trim()) {
    return {
      normalized: '',
      isValid: false,
      error: 'URL не может быть пустым'
    };
  }
  
  const normalized = normalizeUrl(urlString);
  
  // Проверяем валидность нормализованного URL
  if (!isValidUrl(normalized)) {
    return {
      normalized,
      isValid: false,
      error: 'Некорректный формат URL. Пример: example.com или https://example.com'
    };
  }
  
  // Проверяем что это не localhost или локальный IP (для продакшна)
  try {
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase();
    
    if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('192.168.')) {
      return {
        normalized,
        isValid: false,
        error: 'Локальные адреса не допускаются'
      };
    }
    
    return {
      normalized,
      isValid: true
    };
  } catch (e) {
    return {
      normalized,
      isValid: false,
      error: 'Ошибка при обработке URL'
    };
  }
}

/**
 * Извлекает домен из URL
 */
export function getDomainFromUrl(urlString: string): string {
  try {
    const url = new URL(normalizeUrl(urlString));
    return url.hostname;
  } catch (e) {
    return '';
  }
}

/**
 * Форматирует URL для отображения (убирает протокол)
 */
export function formatUrlForDisplay(urlString: string): string {
  try {
    const url = new URL(normalizeUrl(urlString));
    return url.hostname + url.pathname + url.search + url.hash;
  } catch (e) {
    return urlString;
  }
}

