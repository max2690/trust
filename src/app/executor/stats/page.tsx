"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ExecutorNav } from "@/components/layout/ExecutorNav";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Target, CheckCircle, TrendingUp } from "lucide-react";

interface Stats {
  totalEarnings: number;
  activeTasks: number;
  completedTasks: number;
  rating: number;
}

export default function StatsPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/auth/signin?role=executor')
    },
  });
  
  const [stats, setStats] = useState<Stats>({
    totalEarnings: 0,
    activeTasks: 0,
    completedTasks: 0,
    rating: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      (async () => {
        try {
          // Загружаем выполнения для расчета статистики
          const res = await fetch("/api/executions", { cache: "no-store" });
          const data = await res.json();
          
          type Exec = { status: string; reward?: number };
          const executions: Exec[] = (data.executions || []) as Exec[];
          const completed = executions.filter((e: Exec) => e.status === "COMPLETED" || e.status === "APPROVED");
          const active = executions.filter((e: Exec) => 
            ['IN_PROGRESS', 'PENDING', 'UPLOADED', 'PENDING_REVIEW'].includes(e.status)
          );
          const totalEarnings = completed.reduce((sum: number, e: Exec) => sum + (e.reward || 0), 0);
          
          setStats({
            totalEarnings,
            activeTasks: active.length,
            completedTasks: completed.length,
            rating: completed.length > 0 ? 4.8 : 0, // TODO: реальный рейтинг
          });
        } catch (error) {
          console.error("Ошибка загрузки статистики:", error);
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
        <h1 className="text-2xl font-bold mb-6">Моя статистика</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-mb-gray mb-1">Заработано</p>
                  <p className="text-2xl font-bold text-mb-gold">
                    {stats.totalEarnings.toLocaleString()}₽
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-mb-gold" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-mb-gray mb-1">Активные задания</p>
                  <p className="text-2xl font-bold text-mb-turquoise">
                    {stats.activeTasks}
                  </p>
                </div>
                <Target className="h-8 w-8 text-mb-turquoise" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-mb-gray mb-1">Выполнено</p>
                  <p className="text-2xl font-bold text-mb-white">
                    {stats.completedTasks}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-mb-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-mb-gray mb-1">Рейтинг</p>
                  <p className="text-2xl font-bold text-mb-turquoise">
                    {stats.rating > 0 ? stats.rating.toFixed(1) : '-'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-mb-turquoise" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}




