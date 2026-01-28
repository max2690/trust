-- Очистка динамических данных MB-TRUST (SQLite)
-- ВНИМАНИЕ: удаляет ПОЛЬЗОВАТЕЛЬСКИЕ данные и заказы.
-- Справочники (trust_levels, commission_settings, platform_settings, cities) остаются.

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

-- Дочерние таблицы
DELETE FROM executions;
DELETE FROM refunds;
DELETE FROM payments;
DELETE FROM referrals;
DELETE FROM executor_daily_limits;
DELETE FROM activation_stories;
DELETE FROM payouts;
DELETE FROM telegram_verifications;

-- Заказы
DELETE FROM orders;

-- Пользователи: сбрасываем привязки Telegram и флаги
UPDATE users
   SET telegramId = NULL,
       telegramUsername = NULL,
       verificationCode = NULL,
       preferredMessenger = NULL,
       followersApprox = NULL,
       dailyTasksOptIn = 0,
       isVerified = 0,
       balance = 0
 WHERE 1=1;

-- При необходимости можно удалить тестовых пользователей полностью (раскомментируйте):
-- DELETE FROM users WHERE email LIKE '%@test%'
--                         OR name LIKE 'Тест%'
--                         OR phone LIKE '+7999%';

COMMIT;
PRAGMA foreign_keys=ON;

-- Освобождение файла БД (опционально, выполняйте отдельно):
-- VACUUM;
