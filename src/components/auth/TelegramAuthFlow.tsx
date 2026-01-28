'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Copy, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'

interface TelegramAuthFlowProps {
  onBack?: () => void
}

export function TelegramAuthFlow({ onBack }: TelegramAuthFlowProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'idle' | 'loading' | 'pending' | 'completed' | 'error'>('idle')
  const [code, setCode] = useState<string | null>(null)
  const [deepLink, setDeepLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [tempUserId] = useState(() => `temp_${Date.now()}`) // Временный ID для проверки

  const startAuth = async () => {
    setStatus('loading')
    setError(null)

    try {
      // Генерируем код верификации (как при регистрации)
      const res = await fetch('/api/verification/telegram/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: tempUserId })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка генерации кода')
      }

      setCode(data.code)
      setDeepLink(data.deepLink)
      setStatus('pending')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка генерации кода')
      setStatus('error')
    }
  }

  const copyCode = async () => {
    if (!code) return
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code)
        setCopied(true)
      } else {
        // Fallback
        const textArea = document.createElement("textarea")
        textArea.value = code
        
        // Избегаем скролла на мобильных
        textArea.style.position = "fixed"
        textArea.style.left = "-9999px"
        textArea.style.top = "0"
        
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          document.execCommand('copy')
          setCopied(true)
        } catch (err) {
          console.error('Fallback copy failed', err)
        }
        
        document.body.removeChild(textArea)
      }
      
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Ошибка копирования:', err)
    }
  }

  // Проверка статуса авторизации через код
  useEffect(() => {
    if (status !== 'pending' || !code) return

    const interval = setInterval(async () => {
      try {
        // Проверяем, был ли использован код для авторизации
        const res = await fetch('/api/verification/telegram/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, tempUserId })
        })

        const data = await res.json()

        if (data.verified && data.telegramId) {
          // Код был использован, пользователь верифицирован в боте
          console.log('[TELEGRAM AUTH] Пользователь верифицирован через бота')
          clearInterval(interval)

          // Авторизуем через NextAuth
          const result = await signIn('telegram', {
            redirect: false,
            id: data.telegramId,
            username: data.telegramUsername,
          })

          if (result?.ok) {
            setStatus('completed')
            // Получаем редирект из query параметров
            const redirect = searchParams.get('redirect')
            const role = searchParams.get('role')

            if (redirect) {
              router.push(redirect)
            } else if (role === 'executor' || data.userRole === 'EXECUTOR') {
              router.push('/executor/available')
            } else {
              router.push('/dashboard/customer')
            }
            
            router.refresh()
          } else {
            setError('Аккаунт с таким Telegram не найден. Пожалуйста, зарегистрируйтесь.')
            setStatus('error')
            setCode(null) // Сбрасываем код
          }
        }
      } catch (err) {
        console.error('[TELEGRAM AUTH] Ошибка проверки:', err)
      }
    }, 2000) // Проверяем каждые 2 секунды

    return () => clearInterval(interval)
  }, [status, code, tempUserId, router, searchParams])

  useEffect(() => {
    // Автоматически запускаем генерацию кода
    if (status === 'idle') {
      startAuth()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'completed') {
    return (
      <Card className="border-mb-turquoise/50 bg-mb-turquoise/5">
        <CardHeader>
          <CardTitle className="text-center text-mb-turquoise flex items-center justify-center gap-2">
            <CheckCircle2 className="w-6 h-6" />
            Авторизация успешна!
          </CardTitle>
          <CardDescription className="text-center">
            Перенаправляем вас в личный кабинет...
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          {onBack && (
            <button
              onClick={onBack}
              className="text-mb-gray hover:text-mb-turquoise transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <CardTitle className="text-center flex-1">Вход через Telegram</CardTitle>
          <div className="w-5" /> {/* Spacer для центрирования */}
        </div>
        <CardDescription className="text-center">
          Авторизуйтесь через Telegram бота
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-mb-turquoise mb-4" />
            <p className="text-mb-gray text-sm">Генерация кода...</p>
          </div>
        )}

        {status === 'pending' && code && deepLink && (
          <>
            <div className="bg-mb-black/50 rounded-lg p-4 text-center space-y-3">
              <p className="text-sm text-mb-gray">Ваш код для авторизации:</p>
              <div className="relative flex justify-center items-center h-12">
                <p className="text-3xl font-mono font-bold text-mb-turquoise tracking-wider select-all">
                  {code.toUpperCase()}
                </p>
              </div>
              <p className="text-xs text-mb-gray">
                Отправьте этот код боту для авторизации
              </p>
            </div>

            <div className="space-y-3">
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full" size="lg">
                  <Send className="mr-2 h-5 w-5" />
                  Открыть Telegram бота
                </Button>
              </a>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-mb-gray/20"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-mb-black text-mb-gray">или</span>
                </div>
              </div>

              <Button
                onClick={copyCode}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Copy className="mr-2 h-4 w-4" />
                {copied ? 'Код скопирован!' : 'Скопировать код'}
              </Button>
            </div>

            <div className="bg-mb-gold/10 border border-mb-gold/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-mb-white mb-2">Как это работает:</h4>
              <ol className="text-xs text-mb-gray space-y-2">
                <li className="flex gap-2">
                  <span className="text-mb-turquoise shrink-0">1.</span>
                  <span>Нажмите &quot;Открыть Telegram бота&quot; или скопируйте код</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-mb-turquoise shrink-0">2.</span>
                  <span>Отправьте код боту в Telegram</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-mb-turquoise shrink-0">3.</span>
                  <span>Вернитесь на эту страницу — вы будете автоматически авторизованы</span>
                </li>
              </ol>
            </div>

            <div className="flex items-center gap-2 text-sm text-mb-gray justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Ожидание авторизации через Telegram...</span>
            </div>
          </>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <p className="text-mb-gray text-sm">Произошла ошибка при генерации кода</p>
            <Button onClick={startAuth} variant="outline">
              Попробовать снова
            </Button>
          </div>
        )}

        <div className="text-center text-sm text-mb-gray pt-4 border-t border-mb-gray/20">
          <p>
            Нет аккаунта?{' '}
            <a href="/auth/signup" className="text-mb-turquoise hover:underline">
              Зарегистрироваться
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
