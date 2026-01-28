"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyForm() {
  const sp = useSearchParams();
  const userId = sp.get("userId");
  const router = useRouter();
  const [status, setStatus] = useState<"idle"|"pending"|"done"|"error">("idle");
  const [signupToken, setSignupToken] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    if (typeof window !== "undefined") {
      setSignupToken(sessionStorage.getItem(`signup_token_${userId}`));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setStatus("error");
      return;
    }
    
    setStatus("pending");
    
    const t = setInterval(async () => {
      try {
        const params = new URLSearchParams({ userId });
        if (signupToken) {
          params.set("signupToken", signupToken);
        }
        const r = await fetch(`/api/users?${params.toString()}`, { cache: "no-store" });
        const data = await r.json();
        
        if (data?.user?.isVerified) {
          clearInterval(t);
          setStatus("done");
          setTimeout(() => {
            router.push(data.user.role === "CUSTOMER" ? "/dashboard/customer" : "/executor/available");
          }, 500);
        }
      } catch (error) {
        console.error("Ошибка проверки верификации:", error);
        setStatus("error");
      }
    }, 1500);
    
    return () => clearInterval(t);
  }, [userId, router, signupToken]);

  return (
    <div className="min-h-screen bg-mb-black text-mb-white flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-center">Подтвердите аккаунт в Telegram</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-mb-gray">
            Мы ждём подтверждение из бота. Откройте Telegram и завершите верификацию.
          </p>
          
          <div className="text-sm text-mb-turquoise">
            Статус: {
              status === "pending" ? "⏳ Ожидаем подтверждения..." : 
              status === "done" ? "✅ Готово! Перенаправляем..." : 
              status === "error" ? "❌ Ошибка" :
              "⏸️ Не начато"
            }
          </div>
          
          {userId && (
            <Link 
              href={`/auth/signup/executor?userId=${userId}`}
              className="text-sm text-mb-gray hover:text-mb-turquoise transition-colors"
            >
              Начать заново
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-mb-black text-mb-white flex items-center justify-center">
        <div className="text-mb-gray">Загрузка...</div>
      </div>
    }>
      <VerifyForm />
    </Suspense>
  );
}






