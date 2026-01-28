import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { processImage, processUploadedFile } from '@/services/image.service'

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
  console.log('[API /images/process] Начало обработки запроса')

  try {
    const contentType = request.headers.get('content-type')
    console.log('[API /images/process] Content-Type:', contentType)

    let result

    if (contentType?.includes('multipart/form-data')) {
      // Обработка загруженного файла
      const formData = await request.formData()
      const imageFile = formData.get('image') as File | null
      const qrText = (formData.get('qrText') as string) || `order-${nanoid()}`
      const overlay = formData.get('overlay') !== 'false'

      if (!imageFile) {
        // Если файл не загружен, используем imageUrl из formData
        const imageUrl = formData.get('imageUrl') as string
        if (!imageUrl) {
          return errorResponse('Не все поля заполнены', 400)
        }

        result = await processImage({
          imageUrl,
          qrText,
          overlay
        })
      } else {
        // Обрабатываем загруженный файл
        result = await processUploadedFile(imageFile, qrText, overlay)
      }
    } else {
      // Обработка JSON запроса
      let body
      try {
        body = await request.json()
      } catch (error) {
        return errorResponse('Invalid JSON', 400)
      }

      const { imageUrl, qrText, overlay = true } = body

      if (!imageUrl) {
        return errorResponse('Не все поля заполнены', 400)
      }

      result = await processImage({
        imageUrl,
        qrText: qrText || `order-${nanoid()}`,
        overlay
      })
    }

    console.log('[API /images/process] ✅ Успешно завершено')
    return successResponse(result)
  } catch (error) {
    console.error('[API /images/process] ❌ ОШИБКА:', error)

    if (error instanceof Error) {
      if (error.message.includes('Не все поля заполнены')) {
        return errorResponse(error.message, 400)
      }
      if (error.message.includes('не найден') || error.message.includes('Файл не найден')) {
        return errorResponse(error.message, 404)
      }
      if (error.message.includes('Не удалось загрузить')) {
        return errorResponse(error.message, 400)
      }
    }

    return errorResponse(
      'Ошибка обработки изображения',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

