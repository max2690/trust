/**
 * Сервис для работы с заказами
 * Содержит бизнес-логику создания заказов, расчета комиссий и генерации QR-кодов
 */

import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import QRCode from 'qrcode'
import type { UserRole } from '@prisma/client'
import { Prisma } from '@prisma/client'

export interface CreateOrderData {
  title: string
  description: string
  targetAudience?: string
  targetUrl?: string
  reward: number | string
  processedImageUrl?: string
  qrCodeUrl?: string
  customerId: string
  quantity?: number | string
  socialNetwork?: string
  deadline?: string
  campaignType?: string
  totalQuantity?: number
  dailyDistribution?: Record<string, unknown>
  autoDistribution?: boolean
  refundOnFailure?: boolean
  refundDeadline?: string
  targetCountry?: string
  targetRegion?: string
  targetCity?: string
}

export interface OrderCalculation {
  totalReward: number
  rewardPerExecution: number
  platformCommission: number
  executorEarnings: number
  platformEarnings: number
}

/**
 * Проверяет, может ли пользователь создавать заказы
 */
export async function validateCustomer(customerId: string): Promise<{ valid: boolean; error?: string }> {
  if (!customerId) {
    return { valid: false, error: 'Требуется авторизация' }
  }

  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    select: { role: true, isBlocked: true }
  })

  if (!customer) {
    return { valid: false, error: 'Пользователь не найден' }
  }

  if (customer.isBlocked) {
    return { valid: false, error: 'Пользователь заблокирован' }
  }

  if (customer.role !== 'CUSTOMER') {
    return { valid: false, error: 'Создавать заказы могут только заказчики' }
  }

  return { valid: true }
}

/**
 * Рассчитывает стоимость заказа и комиссии
 */
export function calculateOrderPricing(
  reward: number,
  quantity: number = 1
): OrderCalculation {
  const totalReward = reward
  const rewardPerExecution = totalReward / quantity
  const platformCommission = totalReward * 0.1 // 10% комиссия платформы
  const executorEarnings = totalReward * 0.9
  const platformEarnings = totalReward * 0.1

  return {
    totalReward,
    rewardPerExecution,
    platformCommission,
    executorEarnings,
    platformEarnings
  }
}

/**
 * Генерирует QR-код для заказа
 */
export async function generateQRCode(
  orderId: string,
  socialNetwork: string = 'INSTAGRAM',
  orderNumber?: number,
  totalOrders?: number
): Promise<string> {
  const qrCodeData = {
    orderId,
    platform: socialNetwork,
    url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/track/${nanoid()}`,
    timestamp: new Date().toISOString(),
    ...(orderNumber && { orderNumber }),
    ...(totalOrders && { totalOrders })
  }

  const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrCodeData), {
    width: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })

  return qrCodeImage
}

/**
 * Создает заказ в базе данных
 */
export async function createOrderInDB(data: {
  id: string
  title: string
  description: string
  targetAudience: string
  targetUrl: string | null
  pricePerStory: number
  platformCommission: number
  executorEarnings: number
  platformEarnings: number
  budget: number
  reward: number
  customerId: string
  region: string
  socialNetwork: string
  targetCountry: string
  targetRegion: string | null
  targetCity: string | null
  qrCode: string
  qrCodeExpiry: Date
  processedImageUrl: string
  qrCodeUrl: string
  quantity: number
  maxExecutions: number
  completedCount: number
  deadline: Date
  campaignType: string
  totalQuantity: number
  dailySchedule: Record<string, unknown> | null
  autoDistribution: boolean
  refundOnFailure: boolean
  refundDeadline: Date
  status: string
}) {
  return await prisma.order.create({
    data: {
      id: data.id,
      title: data.title,
      description: data.description,
      targetAudience: data.targetAudience,
      targetUrl: data.targetUrl,
      pricePerStory: data.pricePerStory,
      platformCommission: data.platformCommission,
      executorEarnings: data.executorEarnings,
      platformEarnings: data.platformEarnings,
      budget: data.budget,
      reward: data.reward,
      customer: {
        connect: { id: data.customerId }
      },
      region: data.region,
      socialNetwork: data.socialNetwork as 'INSTAGRAM' | 'TIKTOK' | 'VK' | 'TELEGRAM' | 'WHATSAPP' | 'FACEBOOK',
      targetCountry: data.targetCountry,
      targetRegion: data.targetRegion,
      targetCity: data.targetCity,
      qrCode: data.qrCode,
      qrCodeExpiry: data.qrCodeExpiry,
      processedImageUrl: data.processedImageUrl,
      qrCodeUrl: data.qrCodeUrl,
      quantity: data.quantity,
      maxExecutions: data.maxExecutions,
      completedCount: data.completedCount,
      deadline: data.deadline,
      campaignType: data.campaignType as 'SINGLE' | 'WEEKLY' | 'BIWEEKLY',
      totalQuantity: data.totalQuantity,
      dailySchedule: data.dailySchedule ? (data.dailySchedule as Prisma.InputJsonValue) : Prisma.JsonNull,
      autoDistribution: data.autoDistribution,
      refundOnFailure: data.refundOnFailure,
      refundDeadline: data.refundDeadline,
      status: data.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    }
  })
}

/**
 * Основная функция создания заказа
 */
export async function createOrder(orderData: CreateOrderData) {
  // Валидация обязательных полей
  if (!orderData.title || !orderData.description || !orderData.reward) {
    throw new Error('Не все поля заполнены')
  }

  // Проверка пользователя
  const validation = await validateCustomer(orderData.customerId)
  if (!validation.valid) {
    throw new Error(validation.error || 'Ошибка валидации пользователя')
  }

  // Парсинг данных
  const parsedReward = parseFloat(String(orderData.reward))
  const quantity = parseInt(String(orderData.quantity || 1), 10)
  const socialNetwork = orderData.socialNetwork || 'INSTAGRAM'
  const deadlineDate = orderData.deadline
    ? new Date(orderData.deadline)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  // Расчет стоимости
  const pricing = calculateOrderPricing(parsedReward, quantity)

  // Обработка изображений
  const finalProcessedImageUrl =
    orderData.processedImageUrl ||
    `https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=${encodeURIComponent(orderData.title)}`

  // Создание заказов
  const orders = []

  for (let i = 0; i < quantity; i++) {
    const orderId = nanoid()
    const qrCodeId = `${orderId}-${i}`

    // Генерируем QR код если не предоставлен
    let finalQrCodeUrl = orderData.qrCodeUrl
    if (!finalQrCodeUrl) {
      finalQrCodeUrl = await generateQRCode(orderId, socialNetwork, i + 1, quantity)
    }

    const order = await createOrderInDB({
      id: orderId,
      title: quantity > 1 ? `${orderData.title} (${i + 1}/${quantity})` : orderData.title,
      description: orderData.description,
      targetAudience: orderData.targetAudience || '',
      targetUrl: orderData.targetUrl || null,
      pricePerStory: pricing.rewardPerExecution,
      platformCommission: pricing.platformCommission,
      executorEarnings: pricing.executorEarnings,
      platformEarnings: pricing.platformEarnings,
      budget: pricing.totalReward,
      reward: pricing.rewardPerExecution,
      customerId: orderData.customerId,
      region: orderData.targetRegion || orderData.targetCity || 'Россия',
      socialNetwork,
      targetCountry: orderData.targetCountry || 'Россия',
      targetRegion: orderData.targetRegion || null,
      targetCity: orderData.targetCity || null,
      qrCode: qrCodeId,
      qrCodeExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      processedImageUrl: finalProcessedImageUrl,
      qrCodeUrl: finalQrCodeUrl,
      quantity: 1,
      maxExecutions: 1,
      completedCount: 0,
      deadline: deadlineDate,
      campaignType: orderData.campaignType || 'SINGLE',
      totalQuantity: quantity > 1 ? quantity : (orderData.totalQuantity || 1),
      dailySchedule: quantity > 1 ? null : (orderData.dailyDistribution || null),
      autoDistribution: orderData.autoDistribution ?? true,
      refundOnFailure: orderData.refundOnFailure ?? true,
      refundDeadline: orderData.refundDeadline
        ? new Date(orderData.refundDeadline)
        : new Date(deadlineDate.getTime() + 72 * 60 * 60 * 1000),
      status: 'PENDING'
    })

    orders.push(order)
  }

  return {
    orders: quantity === 1 ? orders[0] : orders,
    success: true,
    message: quantity > 1 ? `Создано ${quantity} заказов` : 'Заказ создан'
  }
}

