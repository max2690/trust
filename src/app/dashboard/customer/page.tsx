'use client';

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Container from '@/components/ui/container'
import { OrderCard } from '@/components/business/OrderCard'
import { BalanceCard } from '@/components/payment/BalanceCard'
import { ArrowLeft, Plus, Target, DollarSign, Users, TrendingUp } from 'lucide-react'

interface Order {
  id: string
  title: string
  description: string
  targetAudience: string
  reward: number
  processedImageUrl?: string
  qrCodeUrl?: string
  deadline?: string
  customer?: {
    name: string
    level: string
  }
}

export default function CustomerDashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/auth/signin?role=customer')
    },
  })
  
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    activeOrders: 0,
    totalSpent: 0,
    totalExecutors: 0,
    ctr: 0
  })
  const [balance, setBalance] = useState({
    current: 0,
    reserved: 0,
    totalEarned: 0
  })
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Проверка роли пользователя
  useEffect(() => {
    if (status === 'authenticated') {
      const userRole = (session?.user as { role?: string })?.role
      if (userRole && userRole !== 'CUSTOMER') {
        console.warn('[DASHBOARD] Пользователь не является заказчиком, редирект')
        router.push('/auth/signin')
      }
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchOrders()
      fetchStats()
      fetchBalance()
    }
  }, [status, session])

  const fetchOrders = async () => {
    if (!session?.user?.id) {
      console.error('[DASHBOARD] Нет userId в сессии')
      return
    }
    
    try {
      // Используем реальный userId из сессии, а не хардкод!
      const response = await fetch(`/api/orders?role=customer&userId=${session.user.id}`)
      const result = await response.json()
      
      if (result.success) {
        setOrders(result.orders || [])
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!session?.user?.id) return
    
    try {
      const response = await fetch(`/api/orders/stats?userId=${session.user.id}`)
      const result = await response.json()
      
      if (result.success) {
        setStats(result.stats || stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchBalance = async () => {
    if (!session?.user?.id) return
    
    try {
      const response = await fetch(`/api/balance?userId=${session.user.id}`)
      const result = await response.json()
      
      if (result.success) {
        setBalance(result.balance || balance)
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Вы уверены, что хотите удалить это задание?')) {
      return
    }

    console.log('[CustomerDashboard] Удаление заказа:', orderId)

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        console.log('[CustomerDashboard] ✅ Заказ удален')
        setDeleteMessage({
          type: 'success',
          text: 'Задание успешно удалено',
        })
        // Обновляем список заказов
        fetchOrders()
        fetchStats()
        
        // Скрываем сообщение через 3 секунды
        setTimeout(() => setDeleteMessage(null), 3000)
      } else {
        console.error('[CustomerDashboard] Ошибка удаления:', result.error)
        setDeleteMessage({
          type: 'error',
          text: result.error || 'Ошибка удаления задания',
        })
        setTimeout(() => setDeleteMessage(null), 5000)
      }
    } catch (error) {
      console.error('[CustomerDashboard] КРИТИЧЕСКАЯ ОШИБКА:', error)
      setDeleteMessage({
        type: 'error',
        text: 'Произошла ошибка при удалении задания',
      })
      setTimeout(() => setDeleteMessage(null), 5000)
    }
  }

  // Показываем загрузку пока проверяется сессия
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-mb-black flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    )
  }
  
  // useSession({ required: true }) гарантирует, что status === 'authenticated' здесь
  if (!session?.user) {
    return null
  }

  return (
    <div className="min-h-screen bg-mb-black text-mb-white">
      {/* Оверлей сообщений об удалении */}
      {deleteMessage && (
        <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <div
            className={`pointer-events-auto rounded-lg px-6 py-3 shadow-2xl border text-sm max-w-md w-full flex items-center gap-3 animate-in slide-in-from-top duration-300 ${
              deleteMessage.type === 'success'
                ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100'
                : 'border-red-500/60 bg-red-500/20 text-red-100'
            }`}
          >
            {deleteMessage.type === 'success' ? (
              <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <p className="flex-1">{deleteMessage.text}</p>
          </div>
        </div>
      )}
      
      <Container className="py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Добро пожаловать, {session?.user?.name || 'Пользователь'}!
          </h1>
          <p className="text-mb-gray">Управляйте своими заданиями и отслеживайте результаты</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg hover:shadow-glow transition-all duration-200">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-mb-gray">Активные задания</p>
                  <p className="text-2xl font-bold text-mb-turquoise">{stats.activeOrders}</p>
                </div>
                <Target className="h-8 w-8 text-mb-turquoise" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-glow transition-all duration-200">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-mb-gray">Потрачено</p>
                  <p className="text-2xl font-bold text-mb-gold">{stats.totalSpent.toLocaleString('ru-RU')}₽</p>
                </div>
                <DollarSign className="h-8 w-8 text-mb-gold" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-glow transition-all duration-200">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-mb-gray">Исполнители</p>
                  <p className="text-2xl font-bold text-mb-white">{stats.totalExecutors}</p>
                </div>
                <Users className="h-8 w-8 text-mb-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-glow transition-all duration-200">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-mb-gray">CTR</p>
                  <p className="text-2xl font-bold text-mb-turquoise">{stats.ctr.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-mb-turquoise" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Быстрые действия</h2>
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard/customer/create-order">
              <Button size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Создать задание
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              <DollarSign className="h-4 w-4 mr-2" />
              Пополнить баланс
            </Button>
            <Link href="/dashboard/customer/orders">
              <Button size="lg" variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                Мои задания
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Последние задания</h2>
          {orders.length === 0 ? (
            <Card className="border-0 shadow-lg text-center py-12">
              <CardContent>
                <Target className="h-16 w-16 text-mb-gray mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">У вас пока нет заданий</h3>
                <p className="text-mb-gray mb-6">
                  Создайте первое задание, чтобы начать работу с исполнителями.
                </p>
                <Link href="/dashboard/customer/create-order">
                  <Button>
                    Создать задание
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop и Tablet версия - сетка */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {orders.map((order) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onAccept={() => {}} 
                    compact 
                    hideAcceptButton={true}
                    showDeleteButton={true}
                    onDelete={handleDeleteOrder}
                  />
                ))}
              </div>

              {/* Mobile версия - горизонтальный свайп */}
              <div className="sm:hidden overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                <div className="flex gap-4" style={{ width: 'max-content' }}>
                  {orders.map((order) => (
                    <div key={order.id} className="w-[85vw] max-w-[340px] flex-shrink-0">
                      <OrderCard 
                        order={order} 
                        onAccept={() => {}} 
                        compact 
                        hideAcceptButton={true}
                        showDeleteButton={true}
                        onDelete={handleDeleteOrder}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Индикатор свайпа на мобильных */}
              {orders.length > 1 && (
                <div className="sm:hidden flex justify-center gap-1.5 mt-4">
                  {orders.slice(0, 5).map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-mb-turquoise' : 'bg-mb-gray/30'}`} 
                    />
                  ))}
                  {orders.length > 5 && (
                    <span className="text-xs text-mb-gray ml-1">+{orders.length - 5}</span>
                  )}
                </div>
              )}

              {/* Ссылка на все задания */}
              {orders.length > 6 && (
                <div className="hidden sm:flex justify-center mt-6">
                  <Link href="/dashboard/customer/orders">
                    <Button variant="outline">
                      Показать все задания ({orders.length})
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
        
  {/* Balance */}
        <BalanceCard 
          balance={balance.current} 
          reservedBalance={balance.reserved} 
          totalEarned={balance.totalEarned}
          role="customer"
        />
      </Container>
    </div>
  )
}