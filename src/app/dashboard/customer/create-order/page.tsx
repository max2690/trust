'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createOrderSchema, type CreateOrderFormValues } from '@/lib/validations/order'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import Container from '@/components/ui/container'
import { LocationSelector } from '@/components/business/LocationSelector'
import { CustomerImageUpload } from '@/components/business/CustomerImageUpload'
import { OrderCard } from '@/components/business/OrderCard'
import { ArrowLeft, Target, DollarSign, Users, Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { validateAndNormalizeUrl } from '@/lib/url-utils'
import type { OrderUI } from '@/lib/types'

const SOCIAL_NETWORKS = [
  { value: 'INSTAGRAM', label: 'Instagram', icon: '📷' },
  { value: 'TELEGRAM', label: 'Telegram', icon: '✈️' },
  { value: 'VK', label: 'ВКонтакте', icon: '🔵' },
  { value: 'YOUTUBE', label: 'YouTube', icon: '📺' },
  { value: 'TIKTOK', label: 'TikTok', icon: '🎵' },
  { value: 'WHATSAPP', label: 'WhatsApp', icon: '💬' },
]

export default function CreateOrderPage() {
  const router = useRouter()
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/auth/signin?role=customer')
    },
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('')
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [orderId, setOrderId] = useState<string>('')
  const [urlCheck, setUrlCheck] = useState<{
    status: 'idle' | 'checking' | 'ok' | 'error'
    message?: string
  }>({ status: 'idle' })
  const [overlayMessage, setOverlayMessage] = useState<{
    type: 'success' | 'error' | null
    text: string
  }>({ type: null, text: '' })

  const form = useForm<CreateOrderFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createOrderSchema) as any,
    defaultValues: {
      title: '',
      description: '',
      targetUrl: '',
      reward: '',
      quantity: '1',
      socialNetwork: 'INSTAGRAM',
      deadline: '',
      targetCountry: 'Россия',
      targetRegion: null,
      targetCity: null,
    },
    mode: 'onChange',
  })

  const { register, handleSubmit, watch, setValue, formState: { errors, isValid } } = form
  const watchedValues = watch()
  
  // Обработчик для автоматического добавления протокола при потере фокуса
  const handleUrlBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (value && !value.match(/^https?:\/\//i) && value.length > 3) {
      // Проверяем, что это похоже на URL (содержит точку или начинается с www)
      if (value.includes('.') || value.startsWith('www.')) {
        const normalizedUrl = `https://${value.replace(/^https?:\/\//i, '')}`
        setValue('targetUrl', normalizedUrl, { shouldValidate: true })
      }
    }
  }

  // Автосохранение черновика
  useEffect(() => {
    const savedDraft = localStorage.getItem('createOrderDraft')
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        // Восстанавливаем значения, если они валидны по схеме (частично)
        Object.keys(parsed).forEach((key) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const value = parsed[key]
          if (value !== undefined && value !== null) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setValue(key as any, value)
          }
        })
      } catch (e) {
        console.error('Ошибка восстановления черновика', e)
      }
    }
  }, [setValue])

  useEffect(() => {
    const subscription = watch((value) => {
      localStorage.setItem('createOrderDraft', JSON.stringify(value))
    })
    return () => subscription.unsubscribe()
  }, [watch])

  // Проверка роли пользователя
  useEffect(() => {
    if (status === 'authenticated') {
      const userRole = (session?.user as { role?: string })?.role
      if (userRole && userRole !== 'CUSTOMER') {
        alert('Только заказчики могут создавать задания')
        router.push('/')
      }
    }
  }, [status, session, router])

  // Проверка URL
  useEffect(() => {
    if (!watchedValues.targetUrl) {
      setUrlCheck({ status: 'idle' })
      return
    }

    try {
      // Простая валидация URL перед отправкой на сервер
      createOrderSchema.shape.targetUrl.parse(watchedValues.targetUrl)
      
      const timeoutId = setTimeout(async () => {
        setUrlCheck({ status: 'checking' })
        try {
          const res = await fetch('/api/utils/check-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: watchedValues.targetUrl }),
          })
          const data = await res.json()
          if (data.ok) {
            setUrlCheck({ status: 'ok' })
          } else {
            setUrlCheck({ status: 'error', message: data.error || 'Ссылка недоступна' })
          }
        } catch (error) {
          console.error('Error checking URL:', error)
          setUrlCheck({ status: 'error', message: 'Не удалось проверить ссылку' })
        }
      }, 700)

      return () => clearTimeout(timeoutId)
    } catch {
      setUrlCheck({ status: 'idle' })
    }
  }, [watchedValues.targetUrl])

  const onSubmit = async (data: CreateOrderFormValues) => {
    if (!session?.user?.id) return
    
    // Защита от случайного двойного сабмита
    if (isSubmitting) {
      console.warn('[CreateOrder] Попытка повторного сабмита, игнорируем')
      return
    }

    setIsSubmitting(true)
    setOverlayMessage({ type: null, text: '' })

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          customerId: session.user.id,
          processedImageUrl: processedImageUrl || undefined,
          qrCodeUrl: qrCodeUrl || undefined,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setOverlayMessage({ type: 'success', text: 'Заказ успешно создан!' })
        localStorage.removeItem('createOrderDraft')
        setTimeout(() => router.push('/dashboard/customer'), 1500)
      } else {
        setOverlayMessage({ type: 'error', text: result.error || 'Ошибка создания заказа' })
      }
    } catch (error) {
      console.error('Error creating order:', error)
      setOverlayMessage({ type: 'error', text: 'Произошла ошибка при создании заказа' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Данные для превью
  const previewOrder: OrderUI = {
    id: 'preview',
    title: watchedValues.title || 'Название задания',
    description: watchedValues.description || 'Описание задания будет здесь...',
    reward: parseFloat(watchedValues.reward || '0') / parseInt(watchedValues.quantity || '1'),
    totalReward: parseFloat(watchedValues.reward || '0'),
    quantity: parseInt(watchedValues.quantity || '1'),
    socialNetwork: watchedValues.socialNetwork,
    targetUrl: watchedValues.targetUrl,
    deadline: watchedValues.deadline || new Date(Date.now() + 86400000).toISOString(),
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    processedImageUrl: processedImageUrl || null,
    qrCodeUrl: qrCodeUrl || null,
    targetCountry: watchedValues.targetCountry || 'Россия',
    targetRegion: watchedValues.targetRegion || null,
    targetCity: watchedValues.targetCity || null,
    customer: {
      name: session?.user?.name || 'Ваше Имя',
      level: 'VERIFIED', // Пример
    },
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-mb-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-mb-turquoise" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mb-black text-mb-white pb-20">
      {/* Оверлей сообщений */}
      {overlayMessage.type && (
        <div className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
          <div className={`pointer-events-auto rounded-xl px-6 py-4 shadow-2xl border text-sm font-medium max-w-md w-full animate-in slide-in-from-top-2 ${
            overlayMessage.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 backdrop-blur-sm' 
              : 'bg-red-950/90 border-red-500/50 text-red-200 backdrop-blur-sm'
          }`}>
            {overlayMessage.text}
          </div>
        </div>
      )}

      <Container className="py-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Создать задание</h1>
            <p className="text-mb-gray text-sm mt-1">Заполните форму, чтобы найти исполнителей</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Левая колонка - Форма */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Основная информация */}
              <Card className="border-0 shadow-lg bg-mb-black/40 border-mb-gray/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="w-5 h-5 text-mb-turquoise" />
                    Основная информация
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Название задания</label>
                    <Input
                      {...register('title')}
                      placeholder="Например: Реклама новой кофейни"
                      className={errors.title ? 'border-red-500' : ''}
                    />
                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Описание</label>
                    <Textarea
                      {...register('description')}
                      placeholder="Опишите требования к исполнителю и задаче..."
                      rows={4}
                      className={errors.description ? 'border-red-500' : ''}
                    />
                    {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Ссылка на ресурс</label>
                    <div className="relative">
                      <Input
                        {...register('targetUrl')}
                        placeholder="example.com или https://example.com"
                        className={errors.targetUrl ? 'border-red-500' : ''}
                        onBlur={(e) => {
                          handleUrlBlur(e)
                          register('targetUrl').onBlur(e)
                        }}
                      />
                      <div className="absolute right-3 top-2.5">
                        {urlCheck.status === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-mb-gray" />}
                        {urlCheck.status === 'ok' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {urlCheck.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                      </div>
                    </div>
                    {errors.targetUrl && <p className="text-red-500 text-xs mt-1">{errors.targetUrl.message}</p>}
                    {urlCheck.message && urlCheck.status === 'error' && (
                      <p className="text-red-500 text-xs mt-1">{urlCheck.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Платформа */}
              <Card className="border-0 shadow-lg bg-mb-black/40 border-mb-gray/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5 text-mb-turquoise" />
                    Платформа
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SOCIAL_NETWORKS.map((net) => (
                      <button
                        key={net.value}
                        type="button"
                        onClick={() => {
                          try {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            setValue('socialNetwork', net.value as any, { 
                              shouldValidate: true 
                            })
                          } catch (error) {
                            console.error('Ошибка установки социальной сети:', error)
                          }
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
                          watchedValues.socialNetwork === net.value
                            ? 'border-mb-turquoise bg-mb-turquoise/10 text-white shadow-[0_0_15px_rgba(45,212,191,0.2)]'
                            : 'border-mb-gray/20 bg-mb-black/30 text-mb-gray hover:border-mb-gray/40 hover:bg-mb-black/50'
                        }`}
                      >
                        <div className="text-2xl mb-1">{net.icon}</div>
                        <div className="text-xs font-medium">{net.label}</div>
                      </button>
                    ))}
                  </div>
                  {errors.socialNetwork && <p className="text-red-500 text-xs mt-2">{errors.socialNetwork.message}</p>}
                </CardContent>
              </Card>

              {/* Бюджет и условия */}
              <Card className="border-0 shadow-lg bg-mb-black/40 border-mb-gray/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="w-5 h-5 text-mb-gold" />
                    Бюджет и условия
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Общий бюджет (₽)</label>
                      <Input
                        type="number"
                        {...register('reward')}
                        placeholder="1000"
                        className={errors.reward ? 'border-red-500' : ''}
                      />
                      {errors.reward && <p className="text-red-500 text-xs mt-1">{errors.reward.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Количество исполнителей</label>
                      <Input
                        type="number"
                        {...register('quantity')}
                        placeholder="1"
                        min="1"
                        className={errors.quantity ? 'border-red-500' : ''}
                      />
                      {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Геолокация</label>
                    <LocationSelector
                      onLocationChange={(loc) => {
                        setValue('targetCountry', loc.country || 'Россия')
                        setValue('targetRegion', loc.region)
                        setValue('targetCity', loc.city)
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Дедлайн</label>
                    <Input
                      type="datetime-local"
                      {...register('deadline')}
                      className={errors.deadline ? 'border-red-500' : ''}
                      min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                    />
                    {errors.deadline && <p className="text-red-500 text-xs mt-1">{errors.deadline.message}</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Креатив */}
              <Card className="border-0 shadow-lg bg-mb-black/40 border-mb-gray/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Upload className="w-5 h-5 text-mb-turquoise" />
                    Креатив (опционально)
                  </CardTitle>
                  <CardDescription>
                    Загрузите изображение для сторис. Мы автоматически добавим на него QR-код.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomerImageUpload
                    onImageProcessed={(processedUrl, qrUrl, orderIdFromUpload) => {
                      setProcessedImageUrl(processedUrl)
                      setQrCodeUrl(qrUrl)
                      setOrderId(orderIdFromUpload)
                    }}
                  />
                </CardContent>
              </Card>

              <Button
                type="submit"
                size="lg"
                className="w-full text-lg h-12 bg-mb-turquoise hover:bg-mb-turquoise/90 text-mb-black font-bold shadow-[0_0_20px_rgba(45,212,191,0.3)] hover:shadow-[0_0_30px_rgba(45,212,191,0.5)] transition-all duration-300"
                disabled={isSubmitting || !isValid}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Создание...
                  </>
                ) : (
                  'Опубликовать задание'
                )}
              </Button>
            </form>
          </div>

          {/* Правая колонка - Live Preview */}
          <div className="lg:col-span-5">
            <div className="sticky top-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-mb-gray uppercase tracking-wider">Предпросмотр</h2>
                <Badge variant="outline" className="text-xs bg-mb-turquoise/10 text-mb-turquoise border-mb-turquoise/30">
                  Live Preview
                </Badge>
              </div>
              
              <div className="opacity-90 hover:opacity-100 transition-opacity duration-300">
                <OrderCard 
                  order={previewOrder} 
                  onAccept={() => {}} 
                  hideAcceptButton={true}
                />
              </div>

              <div className="bg-mb-blue/10 border border-mb-blue/20 rounded-xl p-5 backdrop-blur-sm">
                <h3 className="font-semibold mb-3 text-mb-blue flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Что происходит дальше?
                </h3>
                <ul className="text-sm space-y-2 text-mb-gray/90">
                  <li className="flex gap-2">
                    <span className="text-mb-blue">•</span>
                    <span>Задание появится в ленте исполнителей мгновенно</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-mb-blue">•</span>
                    <span>Деньги заморозятся на балансе (Safe Deal)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-mb-blue">•</span>
                    <span>Вы получите отчеты и скриншоты после выполнения</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
