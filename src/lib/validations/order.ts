import { z } from 'zod'

export const createOrderSchema = z.object({
  title: z
    .string()
    .min(5, 'Название должно содержать минимум 5 символов')
    .max(100, 'Название слишком длинное (максимум 100 символов)'),
  description: z
    .string()
    .min(20, 'Описание должно быть подробным (минимум 20 символов)')
    .max(1000, 'Описание слишком длинное'),
  targetUrl: z
    .string()
    .url('Введите корректную ссылку (например, https://example.com)'),
  reward: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 100, {
      message: 'Минимальный бюджет 100₽',
    }),
  quantity: z
    .string()
    .optional()
    .default('1')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 1, {
      message: 'Минимум 1 исполнение',
    }),
  socialNetwork: z.enum(['INSTAGRAM', 'TELEGRAM', 'VK', 'YOUTUBE', 'TIKTOK', 'WHATSAPP', 'FACEBOOK']),
  deadline: z
    .string()
    .refine((val) => new Date(val) > new Date(Date.now() + 3600000), {
      message: 'Дедлайн должен быть минимум через 1 час от текущего времени',
    }),
  targetCountry: z.string().optional(),
  targetRegion: z.string().nullable().optional(),
  targetCity: z.string().nullable().optional(),
})

export type CreateOrderFormValues = z.infer<typeof createOrderSchema>

