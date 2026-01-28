import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createOrder } from '@/services/order.service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRegionByCity, getCitiesByRegion } from '@/lib/russia-geo-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Стандартизированный формат ответа об ошибке
 */
function errorResponse(error: string, status: number = 500, details?: string) {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details && { details })
    },
    { status }
  )
}

/**
 * Стандартизированный формат успешного ответа
 */
function successResponse(data: unknown, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      ...(typeof data === 'object' && data !== null ? data : { data })
    },
    { status }
  )
}

export async function POST(request: NextRequest) {
  console.log('[API /orders] Начало создания заказа')

  try {
    const body = await request.json()
    console.log('[API /orders] Получены данные:', {
      title: body.title,
      reward: body.reward,
      customerId: body.customerId,
      quantity: body.quantity,
      hasProcessedImage: !!body.processedImageUrl,
      hasQrCode: !!body.qrCodeUrl
    })

    // Используем сервис для создания заказа
    const result = await createOrder(body)

    console.log('[API /orders] ✅ Заказ(ы) создан(ы) успешно')
    return successResponse(result)
  } catch (error) {
    console.error('[API /orders] ❌ ОШИБКА:', error)

    // Обработка известных ошибок
    if (error instanceof Error) {
      if (error.message.includes('Не все поля заполнены')) {
        return errorResponse(error.message, 400)
      }
      if (error.message.includes('Требуется авторизация') || error.message.includes('отсутствует customerId')) {
        return errorResponse(error.message, 401)
      }
      if (error.message.includes('не найден')) {
        return errorResponse(error.message, 404)
      }
      if (error.message.includes('только заказчики') || error.message.includes('Неверная роль')) {
        return errorResponse(error.message, 403)
      }
    }

    return errorResponse(
      'Ошибка создания заказа',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    // Пытаемся получить сессию (для веб-пользователей)
    const session = await getServerSession(authOptions)
    const sessionUser = session?.user as { id?: string; role?: string } | undefined
    const sessionUserId = sessionUser?.id
    const sessionUserRole = sessionUser?.role

    let orders;

    if (role === 'executor') {
      // Доступно только для авторизованных исполнителей (или админов)
      if (!sessionUserId || (sessionUserRole !== 'EXECUTOR' && sessionUserRole !== 'SUPER_ADMIN' && sessionUserRole !== 'MODERATOR_ADMIN')) {
        return NextResponse.json({ success: false, error: 'Недостаточно прав' }, { status: 403 })
      }

      // Получаем информацию о пользователе для геофильтрации
      const user = await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: { city: true, region: true, country: true }
      });

      // Формируем условия для геофильтрации с учётом иерархии город→регион
      const geoConditions: Array<{ targetCountry?: string | null; targetRegion?: string | null; targetCity?: string | null }> = [];
      
      if (user) {
        // 1. Вся страна (без уточнения региона/города)
        geoConditions.push({ 
          targetCountry: user.country, 
          targetRegion: null, 
          targetCity: null 
        });

        // 2. Если у исполнителя указан город
        if (user.city) {
          // Определяем регион по городу
          const cityRegion = getRegionByCity(user.city);
          
          // 2a. Заказы для конкретного города исполнителя
          geoConditions.push({ targetCity: user.city });
          
          // 2b. Заказы для региона, в котором находится город исполнителя
          if (cityRegion) {
            geoConditions.push({ 
              targetRegion: cityRegion, 
              targetCity: null 
            });
          }
        }

        // 3. Если у исполнителя указан регион (без города или в дополнение)
        if (user.region) {
          // 3a. Заказы для региона исполнителя (без уточнения города)
          geoConditions.push({ 
            targetRegion: user.region, 
            targetCity: null 
          });
          
          // 3b. Заказы для ЛЮБОГО города в регионе исполнителя
          const citiesInRegion = getCitiesByRegion(user.region);
          for (const city of citiesInRegion) {
            geoConditions.push({ targetCity: city });
          }
        }
      }

      // Заказы доступные для исполнителей с геофильтрацией
      orders = await prisma.order.findMany({
        where: {
          status: 'PENDING',
          ...(geoConditions.length > 0 ? { OR: geoConditions } : {})
        },
        select: {
          id: true,
          title: true,
          description: true,
          targetAudience: true,
          targetUrl: true, // Ссылка на ресурс
          reward: true,
          totalReward: true,
          socialNetwork: true,
          region: true,
          targetCountry: true,
          targetRegion: true,
          targetCity: true,
          processedImageUrl: true,
          qrCodeUrl: true,
          deadline: true,
          status: true,
          createdAt: true,
          quantity: true,
          completedCount: true,
          customer: {
            select: {
              name: true,
              level: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else if (role === 'customer') {
      // Заказы конкретного заказчика
      // Всегда используем ID из сессии, чтобы один заказчик не мог запросить заказы другого
      if (!sessionUserId || (sessionUserRole !== 'CUSTOMER' && sessionUserRole !== 'SUPER_ADMIN' && sessionUserRole !== 'MODERATOR_ADMIN')) {
        return NextResponse.json({ success: false, error: 'Недостаточно прав' }, { status: 403 })
      }

      orders = await prisma.order.findMany({
        where: {
          customerId: sessionUserRole === 'CUSTOMER' ? sessionUserId : sessionUserId
        },
        select: {
          id: true,
          title: true,
          description: true,
          targetAudience: true,
          targetUrl: true, // Ссылка на ресурс
          reward: true,
          totalReward: true,
          socialNetwork: true,
          region: true,
          targetCountry: true,
          targetRegion: true,
          targetCity: true,
          processedImageUrl: true,
          qrCodeUrl: true,
          deadline: true,
          status: true,
          createdAt: true,
          quantity: true,
          completedCount: true,
          executions: {
            select: {
              id: true,
              status: true,
              reward: true,
              createdAt: true,
              screenshotUrl: true,
              executor: {
                select: {
                  name: true,
                  level: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // Все заказы (для админа)
      if (!sessionUserId || (sessionUserRole !== 'SUPER_ADMIN' && sessionUserRole !== 'MODERATOR_ADMIN')) {
        return NextResponse.json({ success: false, error: 'Недостаточно прав' }, { status: 403 })
      }
      orders = await prisma.order.findMany({
        include: {
          customer: {
            select: {
              name: true,
              level: true
            }
          },
          executions: {
            include: {
              executor: {
                select: {
                  name: true,
                  level: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    return NextResponse.json({ orders, success: true });
    
  } catch (error) {
    console.error('Ошибка получения заказов:', error);
    return NextResponse.json({ error: 'Ошибка получения заказов' }, { status: 500 });
  }
}