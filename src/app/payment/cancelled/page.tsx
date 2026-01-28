"use client";

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Container from '@/components/ui/container';

export default function PaymentCancelledPage() {
  const router = useRouter();

  return (
    <Container className="min-h-screen bg-mb-black flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="text-6xl mb-4">❌</div>
          <CardTitle className="text-2xl text-mb-red">
            Платеж отменен
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-mb-gray">
            Операция была отменена. Деньги не списаны с вашего счета.
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => router.push('/dashboard/customer')}
              className="w-full"
            >
              Вернуться в личный кабинет
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/')}
              className="w-full"
            >
              На главную
            </Button>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
