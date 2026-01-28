"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Container from '@/components/ui/container'
import { OrderCard } from '@/components/business/OrderCard'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, Eye, Users, DollarSign, Calendar, Target, Filter } from 'lucide-react'

import type { OrderUI } from '@/lib/types'

type Order = OrderUI & {
  clickCount?: number
  completedExecutions?: number
  qrCodeDataURL?: string
}

export default function OrdersPage() {
  const router = useRouter()
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/auth/signin?role=customer')
    },
  })
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchOrders()
    }
  }, [status, session])

  const fetchOrders = async () => {
    try {
      if (!session?.user?.id) return
      const response = await fetch(`/api/orders?role=customer&userId=${session.user.id}`)
      const result = await response.json()
      
      if (result.success) {
        setOrders(result.orders)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { variant: 'secondary' as const, text: 'Ожидает' },
      IN_PROGRESS: { variant: 'default' as const, text: 'В работе' },
      COMPLETED: { variant: 'gold' as const, text: 'Завершен' },
      CANCELLED: { variant: 'destructive' as const, text: 'Отменен' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  const getSocialNetworkIcon = (network: string) => {
    const icons = {
      INSTAGRAM: '📷',
      TELEGRAM: '✈️',
      VK: '🔵',
      VKONTAKTE: '🔵',
      YOUTUBE: '📺',
      TIKTOK: '🎵',
      WHATSAPP: '💬'
    }
    return icons[network as keyof typeof icons] || '📱'
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Вы уверены, что хотите удалить это задание?')) {
      return
    }

    console.log('[OrdersPage] Удаление заказа:', orderId)

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        console.log('[OrdersPage] ✅ Заказ удален')
        setDeleteMessage({
          type: 'success',
          text: 'Задание успешно удалено',
        })
        fetchOrders()
        setTimeout(() => setDeleteMessage(null), 3000)
      } else {
        console.error('[OrdersPage] Ошибка удаления:', result.error)
        setDeleteMessage({
          type: 'error',
          text: result.error || 'Ошибка удаления задания',
        })
        setTimeout(() => setDeleteMessage(null), 5000)
      }
    } catch (error) {
      console.error('[OrdersPage] КРИТИЧЕСКАЯ ОШИБКА:', error)
      setDeleteMessage({
        type: 'error',
        text: 'Произошла ошибка при удалении задания',
      })
      setTimeout(() => setDeleteMessage(null), 5000)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-mb-black text-mb-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mb-turquoise mx-auto mb-4"></div>
          <p className="text-mb-gray">Загрузка заказов...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mb-black text-mb-white">
      {/* Оверлей сообщений об удалении */}
      {deleteMessage && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pointer-events-none">
          <div className="mt-20 max-w-lg w-full px-4">
            <div
              className={`pointer-events-auto rounded-xl px-4 py-3 shadow-lg border text-sm ${
                deleteMessage.type === 'success'
                  ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                  : 'border-red-500/60 bg-red-500/15 text-red-200'
              }`}
            >
              <p>{deleteMessage.text}</p>
            </div>
          </div>
        </div>
      )}
      
      <Container className="py-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Мои задания</h1>
              <p className="text-mb-gray">Управляйте своими заданиями и отслеживайте результаты</p>
            </div>
            <Button onClick={() => router.push('/dashboard/customer/create-order')}>
              <Plus className="h-4 w-4 mr-2" />
              Создать задание
            </Button>
          </div>

          {/* Фильтр по статусу */}
          {orders.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-mb-gray" />
              <span className="text-sm text-mb-gray">Фильтр:</span>
              <Button
                variant={filterStatus === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterStatus("all")}
              >
                Все ({orders.length})
              </Button>
              <Button
                variant={filterStatus === "PENDING" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterStatus("PENDING")}
              >
                Ожидают ({orders.filter(o => o.status === 'PENDING').length})
              </Button>
              <Button
                variant={filterStatus === "IN_PROGRESS" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterStatus("IN_PROGRESS")}
              >
                В работе ({orders.filter(o => o.status === 'IN_PROGRESS').length})
              </Button>
              <Button
                variant={filterStatus === "COMPLETED" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterStatus("COMPLETED")}
              >
                Завершены ({orders.filter(o => o.status === 'COMPLETED').length})
              </Button>
            </div>
          )}
        </div>

        {orders.length === 0 ? (
          <Card className="border-0 shadow-lg text-center">
            <CardContent>
              <Target className="h-16 w-16 text-mb-gray mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Пока нет заданий</h3>
              <p className="text-mb-gray mb-6">
                Создайте первое задание и начните получать качественные результаты
              </p>
              <Button onClick={() => router.push('/dashboard/customer/create-order')}>
                <Plus className="h-4 w-4 mr-2" />
                Создать задание
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {(() => {
              const filteredOrders = filterStatus === "all" 
                ? orders 
                : orders.filter((o) => o.status === filterStatus);

              if (filteredOrders.length === 0) {
                return (
                  <Card className="border-0 shadow-lg text-center py-8">
                    <CardContent>
                      <p className="text-mb-gray">
                        {filterStatus === "all" 
                          ? "Нет заданий" 
                          : `Нет заданий со статусом "${getStatusBadge(filterStatus).props.children}"`
                        }
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <>
                  {/* Desktop и Tablet версия - сетка */}
                  <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    {filteredOrders.map((order) => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        onAccept={() => { /* no-op in list view */ }} 
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
                      {filteredOrders.map((order) => (
                        <div key={order.id} className="w-[85vw] max-w-[340px] flex-shrink-0">
                          <OrderCard 
                            order={order} 
                            onAccept={() => { /* no-op in list view */ }} 
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
                  {filteredOrders.length > 1 && (
                    <div className="sm:hidden flex justify-center gap-1.5 mt-4">
                      {filteredOrders.slice(0, 5).map((_, idx) => (
                        <div 
                          key={idx} 
                          className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-mb-turquoise' : 'bg-mb-gray/30'}`} 
                        />
                      ))}
                      {filteredOrders.length > 5 && (
                        <span className="text-xs text-mb-gray ml-1">+{filteredOrders.length - 5}</span>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </Container>
    </div>
  )
}

