'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, CheckCircle2, Loader2 } from 'lucide-react'

interface TelegramVerificationProps {
  userId: string
  signupToken?: string | null
  onVerified?: () => void
}

export function TelegramVerification({ userId, signupToken, onVerified }: TelegramVerificationProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'pending' | 'completed' | 'error'>('idle')
  const [code, setCode] = useState<string | null>(null)
  const [deepLink, setDeepLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startVerification = async () => {
    setStatus('loading')
    setError(null)

    try {
      const res = await fetch('/api/verification/telegram/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка запуска верификации')
      }

      setCode(data.code)
      setDeepLink(data.deepLink)
      setStatus('pending')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка запуска верификации')
      setStatus('error')
    }
  }

  // Проверка статуса верификации
  useEffect(() => {
    if (status !== 'pending') return

    const interval = setInterval(async () => {
      try {
        const params = new URLSearchParams({ userId })
        if (signupToken) {
          params.set('signupToken', signupToken)
        }
        const res = await fetch(`/api/users?${params.toString()}`)
        const data = await res.json()

        // Проверяем разные возможные форматы ответа
        const user = data.user || data.users?.[0] || (Array.isArray(data.users) && data.users.length > 0 ? data.users[0] : null)
        
        if (data.success && user?.isVerified) {
          setStatus('completed')
          onVerified?.()
          clearInterval(interval)
        }
      } catch (err) {
        console.error('Ошибка проверки статуса:', err)
      }
    }, 2000) // Проверяем каждые 2 секунды

    return () => clearInterval(interval)
  }, [status, userId, signupToken, onVerified])

  if (status === 'completed') {
    return (
      <Card className="border-mb-turquoise/50 bg-mb-turquoise/5">
        <CardHeader>
          <CardTitle className="text-center text-mb-turquoise">✅ Верификация завершена!</CardTitle>
          <CardDescription className="text-center">
            Ваш аккаунт успешно привязан к Telegram
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-mb-turquoise/50 bg-mb-turquoise/5">
      <CardHeader>
        <CardTitle className="text-center">Верификация через Telegram</CardTitle>
        <CardDescription className="text-center">
          Подтвердите свою личность через Telegram бота
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'idle' || status === 'error' ? (
          <>
            {error && (
              <div className="bg-mb-red/10 border border-mb-red/50 rounded-lg p-3 text-sm text-mb-red">
                {error}
              </div>
            )}
            <div className="bg-mb-black/50 rounded-lg p-4 text-sm text-mb-gray space-y-2">
              <p className="font-semibold text-mb-white">Как это работает:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Нажмите кнопку ниже для начала верификации</li>
                <li>Перейдите по ссылке в Telegram бота</li>
                <li>Ответьте на 6 вопросов в боте</li>
                <li>Вернитесь на сайт — статус обновится автоматически</li>
              </ol>
            </div>
            <Button onClick={startVerification} className="w-full">
              <>
                <Send className="mr-2 h-4 w-4" />
                Начать привязку через Telegram
              </>
            </Button>
          </>
        ) : status === 'pending' && code && deepLink ? (
          <>
            <div className="bg-mb-black/50 rounded-lg p-4 text-center space-y-3">
              <p className="text-sm text-mb-gray">Ваш код верификации:</p>
              <p className="text-2xl font-mono font-bold text-mb-turquoise">{code.toUpperCase()}</p>
              <p className="text-xs text-mb-gray">Этот код будет использован ботом автоматически</p>
            </div>

            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full" variant="default">
                <Send className="mr-2 h-4 w-4" />
                Открыть Telegram бота
              </Button>
            </a>

            <div className="bg-mb-gold/10 border border-mb-gold/30 rounded-lg p-3">
              <p className="text-xs text-mb-gray">
                💡 После ответа на все вопросы в боте, вернитесь на эту страницу. 
                Статус обновится автоматически.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-mb-gray">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Ожидание завершения верификации...</span>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

