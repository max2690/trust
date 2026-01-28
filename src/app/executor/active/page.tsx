"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { OrderCard } from "@/components/business/OrderCard";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
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

export default function ActivePage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/auth/signin?role=executor')
    },
  });
  
  const [execs, setExecs] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      (async () => {
        try {
          // Загружаем выполнения текущего пользователя
          const res = await fetch("/api/executions", { cache: "no-store" });
          const data = await res.json();
          // Фильтруем только активные (IN_PROGRESS, PENDING, UPLOADED, PENDING_REVIEW)
          const activeStatuses = ['IN_PROGRESS', 'PENDING', 'UPLOADED', 'PENDING_REVIEW'];
          const activeExecs = (data.executions ?? []).filter((e: Execution) => 
            activeStatuses.includes(e.status)
          );
          setExecs(activeExecs);
        } catch (error) {
          console.error("Ошибка загрузки выполнений:", error);
          setNotification({ message: 'Ошибка загрузки активных заданий', type: 'error' });
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [status, session]);

  const upload = async (file: File, orderId: string) => {
    if (!session?.user?.id) {
      setNotification({ message: 'Ошибка: не авторизован', type: 'error' });
      return;
    }

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      setNotification({ message: 'Пожалуйста, загрузите изображение', type: 'error' });
      return;
    }

    // Проверка размера файла (макс 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setNotification({ message: 'Размер файла не должен превышать 10MB', type: 'error' });
      return;
    }

    setUploading(orderId);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("orderId", orderId);
    // Примечание: executorId теперь берётся из сессии на сервере
    
    try {
      const r = await fetch("/api/executions/upload", { method: "POST", body: fd });
      if (r.ok) {
        const data = await r.json();
        setNotification({ message: 'Скриншот загружен! Идет автоматическая проверка...', type: 'success' });
        // Обновляем данные вместо полной перезагрузки
        const refreshRes = await fetch("/api/executions", { cache: "no-store" });
        const refreshData = await refreshRes.json();
        const activeStatuses = ['IN_PROGRESS', 'PENDING', 'UPLOADED', 'PENDING_REVIEW'];
        const activeExecs = (refreshData.executions ?? []).filter((e: Execution) => 
          activeStatuses.includes(e.status)
        );
        setExecs(activeExecs);
      } else {
        const data = await r.json();
        setNotification({ message: 'Ошибка: ' + (data.error || 'Неизвестная ошибка'), type: 'error' });
      }
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      setNotification({ message: 'Произошла ошибка при загрузке файла', type: 'error' });
    } finally {
      setUploading(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-mb-black flex items-center justify-center">
        <div className="text-white text-xl">Загрузка…</div>
      </div>
    );
  }
  
  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-mb-black text-mb-white">
      <ExecutorNav />
      {notification && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg border shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-500/20 border-green-500 text-green-300' 
            : 'bg-red-500/20 border-red-500 text-red-300'
        }`}>
          {notification.message}
        </div>
      )}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Активные задания</h1>
        
        {execs.length === 0 ? (
          <Card className="border-0 shadow-lg text-center py-12">
            <CardContent>
              <Clock className="h-16 w-16 text-mb-gray mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Нет активных заданий</h3>
              <p className="text-mb-gray">
                У вас пока нет активных заданий. Примите задание из раздела &quot;Доступные&quot;.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {execs.map((e) => (
              <div key={e.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <ExecutionStatusBadge status={e.status} />
                  {(e.status === 'UPLOADED' || e.status === 'PENDING_REVIEW') && (
                    <span className="text-sm text-mb-gray">
                      Ожидайте проверки модератором
                    </span>
                  )}
                </div>
                <OrderCard
                  order={{
                    id: e.orderId || e.id,
                    title: e.order?.title ?? 'Без названия',
                    ...e.order,
                    reward: e.order?.reward ?? e.reward,
                  }}
                  onAccept={() => {}}
                  hideAcceptButton
                  showScreenshotUpload={(e.status === 'IN_PROGRESS' || e.status === 'PENDING') && !uploading}
                  onScreenshotUpload={(f) => upload(f, e.orderId)}
                />
                {uploading === e.orderId && (
                  <div className="text-center text-sm text-mb-turquoise py-2">
                    ⏳ Загрузка скриншота...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

