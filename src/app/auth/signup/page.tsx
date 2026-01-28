"use client"

import Link from 'next/link'
import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, DollarSign } from 'lucide-react'

function SignUpForm() {
  const router = useRouter()
  const sp = useSearchParams()

  useEffect(() => {
    const role = sp.get('role')
    if (role === 'executor') router.replace('/auth/signup/executor')
    if (role === 'customer' || role === 'business') router.replace('/auth/signup/customer')
  }, [sp, router])
  return (
    <div className="min-h-screen bg-mb-black text-mb-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center text-sm text-mb-gray hover:text-mb-turquoise mb-4 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад на главную
          </Link>
          
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-mb-turquoise to-mb-gold rounded-lg flex items-center justify-center mb-text-glow">
              <span className="text-mb-black font-bold text-sm">MB</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-mb-turquoise to-mb-gold bg-clip-text text-transparent">
              MB-TRUST
            </span>
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Выберите роль</h1>
          <p className="text-mb-gray">Как вы хотите использовать платформу?</p>
        </div>

        {/* Role Selection Cards */}
        <div className="space-y-4">
          <Link href="/auth/signup/customer">
            <Card className="border-0 shadow-lg hover:shadow-glow transition-all duration-200 ease-out cursor-pointer hover:scale-105">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-mb-turquoise/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-mb-turquoise" />
                </div>
                <CardTitle className="text-xl">Заказчик</CardTitle>
                <CardDescription>
                  Размещайте задания на рекламу в сторис других пользователей
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-mb-gray">
                  <div className="flex items-center justify-between">
                    <span>Минимальный депозит:</span>
                    <Badge variant="gold">1000₽</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Стоимость задания:</span>
                    <Badge variant="secondary">от 100₽</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Комиссия платформы:</span>
                    <Badge variant="secondary">20%</Badge>
                  </div>
                </div>
                <Button className="w-full mt-4 transition-all duration-200 ease-out">
                  Разместить задание
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/auth/signup/executor">
            <Card className="border-0 shadow-lg hover:shadow-glow transition-all duration-200 ease-out cursor-pointer hover:scale-105">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-mb-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="h-8 w-8 text-mb-gold" />
                </div>
                <CardTitle className="text-xl">Исполнитель</CardTitle>
                <CardDescription>
                  Выполняйте задания и зарабатывайте на размещении рекламы
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-mb-gray">
                  <div className="flex items-center justify-between">
                    <span>Ваш доход:</span>
                    <Badge variant="gold">40-80% от задания</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Лимит заданий:</span>
                    <Badge variant="secondary">3-9 в день</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Выплаты:</span>
                    <Badge variant="secondary">Мгновенно</Badge>
                  </div>
                </div>
                <Button className="w-full mt-4 transition-all duration-200 ease-out" variant="default">
                  Заработать сейчас
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-mb-gray">
          <p>Уже есть аккаунт? <Link href="/auth/signin" className="text-mb-turquoise hover:underline">Войти</Link></p>
        </div>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-mb-black text-mb-white flex items-center justify-center">
        <div className="text-mb-gray">Загрузка...</div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  )
}