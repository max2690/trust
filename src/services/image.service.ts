/**
 * Сервис для обработки изображений
 * Содержит логику обработки изображений, наложения QR-кодов и сохранения файлов
 */

import sharp from 'sharp'
import QRCode from 'qrcode'
import { nanoid } from 'nanoid'
import fs from 'fs'
import path from 'path'

export interface ProcessImageParams {
  imageUrl: string
  qrText: string
  overlay?: boolean
}

export interface ProcessImageResult {
  orderId: string
  processedImageUrl: string
  qrCodeUrl: string
  success: boolean
}

/**
 * Создает директорию для загрузок если её нет
 */
function ensureUploadsDir(): string {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }
  return uploadsDir
}

/**
 * Загружает изображение из URL или локального файла
 */
async function loadImageBuffer(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith('/uploads/')) {
    // Читаем локальный файл
    const localPath = path.join(process.cwd(), 'public', imageUrl)
    if (!fs.existsSync(localPath)) {
      throw new Error('Файл не найден')
    }
    return fs.readFileSync(localPath)
  } else {
    // Загружаем по URL
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error('Не удалось загрузить изображение')
    }
    return Buffer.from(await imageResponse.arrayBuffer())
  }
}

/**
 * Генерирует QR-код и возвращает его как data URL
 */
export async function generateQRCodeDataURL(qrText: string): Promise<string> {
  return await QRCode.toDataURL(qrText, {
    width: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })
}

/**
 * Обрабатывает изображение: накладывает QR-код и сохраняет файлы
 */
export async function processImage(params: ProcessImageParams): Promise<ProcessImageResult> {
  const { imageUrl, qrText, overlay = true } = params

  if (!imageUrl) {
    throw new Error('Не все поля заполнены')
  }

  // Создаем директорию для загрузок
  const uploadsDir = ensureUploadsDir()

  // Загружаем изображение
  const imageBuffer = await loadImageBuffer(imageUrl)

  // Генерируем уникальный ID для заказа
  const orderId = nanoid()

  // Генерируем QR-код
  const qrCodeDataURL = await generateQRCodeDataURL(qrText)
  const qrCodeBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64')

  // Сохраняем QR-код отдельно
  const qrCodeName = `${orderId}-qrcode.png`
  const qrCodePath = path.join(uploadsDir, qrCodeName)
  fs.writeFileSync(qrCodePath, qrCodeBuffer)

  let processedImageUrl = imageUrl

  // Если нужен overlay, обрабатываем изображение
  if (overlay) {
    const processedImage = await sharp(imageBuffer)
      .resize(800, 600, { fit: 'cover' })
      .composite([
        {
          input: qrCodeBuffer,
          top: 20,
          left: 20,
          blend: 'over'
        }
      ])
      .png()
      .toBuffer()

    const processedImageName = `${orderId}-processed.png`
    const processedImagePath = path.join(uploadsDir, processedImageName)
    fs.writeFileSync(processedImagePath, processedImage)

    processedImageUrl = `/uploads/${processedImageName}`
  }

  const qrCodeUrl = `/uploads/${qrCodeName}`

  return {
    orderId,
    processedImageUrl,
    qrCodeUrl,
    success: true
  }
}

/**
 * Обрабатывает загруженный файл из FormData
 */
export async function processUploadedFile(
  imageFile: File,
  qrText: string,
  overlay: boolean = true
): Promise<ProcessImageResult> {
  const uploadsDir = ensureUploadsDir()

  // Сохраняем файл временно
  const buffer = Buffer.from(await imageFile.arrayBuffer())
  const fileName = `temp-${Date.now()}.${imageFile.name.split('.').pop()}`
  const filePath = path.join(uploadsDir, fileName)
  fs.writeFileSync(filePath, buffer)

  const tempImageUrl = `/uploads/${fileName}`

  // Обрабатываем изображение
  return await processImage({
    imageUrl: tempImageUrl,
    qrText,
    overlay
  })
}

