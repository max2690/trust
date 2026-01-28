/**
 * Тесты для утилит работы с URL
 */

import {
  isValidUrl,
  normalizeUrl,
  validateAndNormalizeUrl,
  getDomainFromUrl,
  formatUrlForDisplay
} from '../url-utils';

describe('URL Utils', () => {
  describe('normalizeUrl', () => {
    it('должен добавлять https:// к URL без протокола', () => {
      expect(normalizeUrl('example.com')).toBe('https://example.com');
      expect(normalizeUrl('www.example.com')).toBe('https://www.example.com');
    });

    it('не должен изменять URL с протоколом', () => {
      expect(normalizeUrl('http://example.com')).toBe('http://example.com');
      expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('должен удалять пробелы', () => {
      expect(normalizeUrl('  example.com  ')).toBe('https://example.com');
    });

    it('должен возвращать пустую строку для пустого ввода', () => {
      expect(normalizeUrl('')).toBe('');
      expect(normalizeUrl('   ')).toBe('https://');
    });
  });

  describe('isValidUrl', () => {
    it('должен возвращать true для валидных URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com/page')).toBe(true);
      expect(isValidUrl('https://subdomain.example.com')).toBe(true);
    });

    it('должен возвращать false для невалидных URL', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('example')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('validateAndNormalizeUrl', () => {
    it('должен валидировать и нормализовать корректный URL', () => {
      const result = validateAndNormalizeUrl('example.com');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('https://example.com');
      expect(result.error).toBeUndefined();
    });

    it('должен отклонять пустые URL', () => {
      const result = validateAndNormalizeUrl('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('URL не может быть пустым');
    });

    it('должен отклонять локальные адреса', () => {
      const results = [
        validateAndNormalizeUrl('localhost'),
        validateAndNormalizeUrl('127.0.0.1'),
        validateAndNormalizeUrl('192.168.1.1')
      ];
      
      results.forEach(result => {
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Локальные адреса не допускаются');
      });
    });

    it('должен отклонять некорректные форматы', () => {
      const result = validateAndNormalizeUrl('just text');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Некорректный формат URL');
    });
  });

  describe('getDomainFromUrl', () => {
    it('должен извлекать домен из URL', () => {
      expect(getDomainFromUrl('https://example.com/page')).toBe('example.com');
      expect(getDomainFromUrl('example.com')).toBe('example.com');
      expect(getDomainFromUrl('http://subdomain.example.com')).toBe('subdomain.example.com');
    });

    it('должен возвращать пустую строку для невалидных URL', () => {
      expect(getDomainFromUrl('not a url')).toBe('');
    });
  });

  describe('formatUrlForDisplay', () => {
    it('должен форматировать URL для отображения', () => {
      expect(formatUrlForDisplay('https://example.com/page')).toBe('example.com/page');
      expect(formatUrlForDisplay('http://example.com')).toBe('example.com');
    });

    it('должен возвращать исходную строку для невалидных URL', () => {
      expect(formatUrlForDisplay('not a url')).toBe('not a url');
    });
  });
});

