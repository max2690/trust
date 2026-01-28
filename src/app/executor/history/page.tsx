"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { OrderCard } from "@/components/business/OrderCard";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { ExecutorNav } from "@/components/layout/ExecutorNav";
import { ExecutionStatusBadge } from "@/components/business/ExecutionStatusBadge";

interface Execution {
  id: string;
  orderId: string;
  status: string;
  reward: number;
  order?: {
    id: string;
    title: string;
    description?: string;
    reward: number;
    processedImageUrl?: string;
    qrCodeUrl?: string;
  };
}

export default function HistoryPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/auth/signin?role=executor')
    },
  });
  
  const [items, setItems] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      (async () => {
        try {
          const res = await fetch("/api/executions?status=COMPLETED", { cache: "no-store" });
          const data = await res.json();
          setItems(data.executions ?? []);
        } catch (error) {
          console.error("Ошибка загрузки истории:", error);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [status, session]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-mb-black flex items-center justify-center">
        <div className="text-white text-xl">Загрузка…</div>
      </div>
    );
  }
  
  // useSession({ required: true }) гарантирует, что status === 'authenticated' здесь
  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-mb-black text-mb-white">
      <ExecutorNav />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">История</h1>
        
        {items.length === 0 ? (
          <Card className="border-0 shadow-lg text-center py-12">
            <CardContent>
              <CheckCircle className="h-16 w-16 text-mb-gray mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">История пуста</h3>
              <p className="text-mb-gray">
                У вас пока нет завершенных заданий.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((e) => (
              <div key={e.id} className="space-y-2">
                <ExecutionStatusBadge status={e.status} />
                <OrderCard 
                  order={{ 
                    id: e.orderId || e.id,
                    title: e.order?.title ?? 'Без названия',
                    ...e.order, 
                    reward: e.order?.reward ?? e.reward 
                  }} 
                  onAccept={() => {}}
                  hideAcceptButton 
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

