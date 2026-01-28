"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { OrderCard } from "@/components/business/OrderCard";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Filter, ArrowUpDown, Clock, DollarSign, Calendar } from "lucide-react";
import { ExecutorNav } from "@/components/layout/ExecutorNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { OrderUI } from "@/lib/types";

export default function AvailablePage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/auth/signin?role=executor')
    },
  });
  
  const [orders, setOrders] = useState<OrderUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNetwork, setFilterNetwork] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "reward" | "deadline">("newest");
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Проверка роли
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'EXECUTOR') {
      console.warn('[EXECUTOR] Пользователь не является исполнителем, редирект')
      router.push('/auth/signin')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      (async () => {
        try {
          const res = await fetch("/api/orders?role=executor", { cache: "no-store" });
          const data = await res.json();
          setOrders(data.orders ?? []);
        } catch (error) {
          console.error("Ошибка загрузки заказов:", error);
          setNotification({ message: 'Ошибка загрузки доступных заданий', type: 'error' });
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [status, session]);

  const handleAccept = async (orderId: string) => {
    if (!session?.user?.id) {
      setNotification({ message: 'Ошибка: не авторизован', type: 'error' });
      return;
    }
    
    try {
      const r = await fetch("/api/executions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orderId, 
          executorId: session.user.id // Используем реальный userId из сессии
        }),
      });
      
      const data = await r.json();
      
      if (data.success) {
        setNotification({ message: 'Заказ принят!', type: 'success' });
        setTimeout(() => {
          router.push("/executor/active");
        }, 1000);
      } else {
        setNotification({ message: 'Ошибка: ' + (data.error || 'Неизвестная ошибка'), type: 'error' });
      }
    } catch (error) {
      console.error("Ошибка принятия заказа:", error);
      setNotification({ message: 'Произошла ошибка при принятии заказа', type: 'error' });
    }
  };

  // Показываем загрузку пока проверяется сессия
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Доступные задания</h1>
          {orders.length > 0 && (
            <Badge variant="secondary">
              Всего: {orders.length}
            </Badge>
          )}
        </div>

        {/* Фильтры и сортировка */}
        {orders.length > 0 && (
          <div className="mb-6 space-y-4">
            {/* Фильтр по социальным сетям */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-mb-gray" />
              <span className="text-sm text-mb-gray">Фильтр:</span>
              <Button
                variant={filterNetwork === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterNetwork("all")}
              >
                Все
              </Button>
              {Array.from(new Set(orders.map((o) => o.socialNetwork))).map((network) => (
                <Button
                  key={network}
                  variant={filterNetwork === network ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterNetwork(network || "all")}
                >
                  {network}
                </Button>
              ))}
            </div>

            {/* Сортировка */}
            <div className="flex items-center gap-2 flex-wrap">
              <ArrowUpDown className="h-4 w-4 text-mb-gray" />
              <span className="text-sm text-mb-gray">Сортировка:</span>
              <Button
                variant={sortBy === "newest" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortBy("newest")}
              >
                <Calendar className="h-3 w-3 mr-1" />
                Новые
              </Button>
              <Button
                variant={sortBy === "reward" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortBy("reward")}
              >
                <DollarSign className="h-3 w-3 mr-1" />
                По награде
              </Button>
              <Button
                variant={sortBy === "deadline" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortBy("deadline")}
              >
                <Clock className="h-3 w-3 mr-1" />
                По дедлайну
              </Button>
            </div>
          </div>
        )}
        
        {orders.length === 0 ? (
          <Card className="border-0 shadow-lg text-center py-12">
            <CardContent>
              <Target className="h-16 w-16 text-mb-gray mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Нет доступных заданий</h3>
              <p className="text-mb-gray">
                В данный момент нет доступных заданий. Задания появятся здесь, когда заказчики их создадут.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Функция сортировки */}
            {(() => {
              const filteredOrders = filterNetwork === "all" 
                ? orders 
                : orders.filter((o) => o.socialNetwork === filterNetwork);
              
              const sortedOrders = [...filteredOrders].sort((a, b) => {
                switch (sortBy) {
                  case "reward":
                    return (Number(b.totalReward ?? b.reward ?? 0)) - (Number(a.totalReward ?? a.reward ?? 0));
                  case "deadline":
                    if (!a.deadline && !b.deadline) return 0;
                    if (!a.deadline) return 1;
                    if (!b.deadline) return -1;
                    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                  case "newest":
                  default:
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                }
              });

              return (
                <>
                  {/* Desktop и Tablet версия - сетка */}
                  <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    {sortedOrders.map((o) => (
                      <OrderCard key={o.id} order={o} onAccept={handleAccept} compact />
                    ))}
                  </div>

                  {/* Mobile версия - горизонтальный свайп */}
                  <div className="sm:hidden overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                    <div className="flex gap-4" style={{ width: 'max-content' }}>
                      {sortedOrders.map((o) => (
                        <div key={o.id} className="w-[85vw] max-w-[340px] flex-shrink-0">
                          <OrderCard order={o} onAccept={handleAccept} compact />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Индикатор свайпа на мобильных */}
                  {sortedOrders.length > 1 && (
                    <div className="sm:hidden flex justify-center gap-1.5 mt-4">
                      {sortedOrders.slice(0, 5).map((_, idx) => (
                        <div 
                          key={idx} 
                          className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-mb-turquoise' : 'bg-mb-gray/30'}`} 
                        />
                      ))}
                      {sortedOrders.length > 5 && (
                        <span className="text-xs text-mb-gray ml-1">+{sortedOrders.length - 5}</span>
                      )}
                    </div>
                  )}

                  {sortedOrders.length === 0 && filterNetwork !== "all" && (
                    <Card className="border-0 shadow-lg text-center py-8">
                      <CardContent>
                        <p className="text-mb-gray">Нет заданий для выбранной социальной сети</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}

