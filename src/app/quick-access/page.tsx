'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function QuickAccessPage() {
  return (
    <div className="min-h-screen bg-mb-black flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl border border-mb-gray/30 shadow-lg shadow-mb-turquoise/10">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-white mb-2">
            🚀 Быстрый доступ к панелям
          </CardTitle>
          <p className="text-mb-gray">
            Выберите роль для входа без авторизации (DEV MODE)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Админ панели */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">👑 Админ панели:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Link href="/admin-god/dashboard" passHref>
                <Button className="w-full h-16 text-lg border border-mb-turquoise/30 hover:border-mb-turquoise/70 shadow-lg shadow-mb-turquoise/10 hover:shadow-glow" variant="outline">
                  <div className="text-center">
                    <div className="text-2xl mb-1">👑</div>
                    <div>Супер-Админ</div>
                    <div className="text-sm text-mb-gray">Полные права</div>
                  </div>
                </Button>
              </Link>
              <Link href="/admin-moderator/dashboard" passHref>
                <Button className="w-full h-16 text-lg border border-mb-turquoise/30 hover:border-mb-turquoise/70 shadow-lg shadow-mb-turquoise/10 hover:shadow-glow" variant="outline">
                  <div className="text-center">
                    <div className="text-2xl mb-1">🔧</div>
                    <div>Модератор</div>
                    <div className="text-sm text-mb-gray">Ограниченные права</div>
                  </div>
                </Button>
              </Link>
            </div>
          </div>

          {/* Пользовательские панели */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">👥 Пользовательские панели:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Link href="/dashboard/customer" passHref>
                <Button className="w-full h-16 text-lg border border-mb-turquoise/30 hover:border-mb-turquoise/70 shadow-lg shadow-mb-turquoise/10 hover:shadow-glow" variant="outline">
                  <div className="text-center">
                    <div className="text-2xl mb-1">👤</div>
                    <div>Заказчик</div>
                    <div className="text-sm text-mb-gray">Создание заказов</div>
                  </div>
                </Button>
              </Link>
              <Link href="/executor/available" passHref>
                <Button className="w-full h-16 text-lg border border-mb-turquoise/30 hover:border-mb-turquoise/70 shadow-lg shadow-mb-turquoise/10 hover:shadow-glow" variant="outline">
                  <div className="text-center">
                    <div className="text-2xl mb-1">🛠️</div>
                    <div>Исполнитель</div>
                    <div className="text-sm text-mb-gray">Выполнение заданий</div>
                  </div>
                </Button>
              </Link>
            </div>
          </div>

          {/* Дополнительные страницы */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">📄 Дополнительные страницы:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link href="/auth/signin" passHref>
                <Button className="w-full border border-mb-turquoise/30 hover:border-mb-turquoise/70 shadow-lg shadow-mb-turquoise/10 hover:shadow-glow" variant="outline">
                  🔐 Вход
                </Button>
              </Link>
              <Link href="/auth/signup" passHref>
                <Button className="w-full border border-mb-turquoise/30 hover:border-mb-turquoise/70 shadow-lg shadow-mb-turquoise/10 hover:shadow-glow" variant="outline">
                  📝 Регистрация
                </Button>
              </Link>
              <Link href="/test-links" passHref>
                <Button className="w-full border border-mb-turquoise/30 hover:border-mb-turquoise/70 shadow-lg shadow-mb-turquoise/10 hover:shadow-glow" variant="outline">
                  🔗 Тест ссылки
                </Button>
              </Link>
            </div>
          </div>

          <div className="text-center pt-4 border-t border-gray-700">
            <p className="text-sm text-mb-gray">
              ⚠️ Эти &quot;костыли&quot; активны только в режиме разработки
            </p>
            <p className="text-xs text-mb-gray mt-1">
              В продакшене будет работать обычная авторизация
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
