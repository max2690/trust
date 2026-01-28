"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Container from '@/components/ui/container';

export default function PaymentSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Автоматически перенаправляем через 5 секунд
    const timer = setTimeout(() => {
      router.push('/dashboard/customer');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Container className="min-h-screen bg-mb-black flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="text-6xl mb-4">✅</div>
          <CardTitle className="text-2xl text-mb-turquoise">
            Платеж успешно выполнен!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-mb-gray">
            Ваш баланс пополнен. Средства поступят в течение нескольких минут.
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => router.push('/dashboard/customer')}
              className="w-full"
            >
              Перейти в личный кабинет
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/')}
              className="w-full"
            >
              На главную
            </Button>
          </div>
          <p className="text-xs text-mb-gray">
            Автоматическое перенаправление через 5 секунд...
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}
