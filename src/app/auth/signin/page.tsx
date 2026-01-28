'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Lock, Phone } from 'lucide-react'
import { TelegramAuthFlow } from '@/components/auth/TelegramAuthFlow'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showTelegramAuth, setShowTelegramAuth] = useState(false)

  const performPostLoginRedirect = (roleFromQuery: string | null) => {
    const redirect = searchParams.get('redirect')
    const role = roleFromQuery || searchParams.get('role')

    if (redirect) {
      router.push(redirect)
    } else if (role === 'executor' || role === 'EXECUTOR') {
      router.push('/executor/available')
    } else if (role === 'business' || role === 'customer' || role === 'CUSTOMER') {
      router.push('/dashboard/customer')
    } else {
      router.push('/')
    }

    router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        phone,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Неверный номер телефона или пароль')
        setLoading(false)
        return
      }

      performPostLoginRedirect(searchParams.get('role'))
    } catch (error) {
      console.error('Ошибка входа:', error)
      setError('Произошла ошибка при входе')
      setLoading(false)
    }
  }

  const handleTelegramLogin = () => {
    setShowTelegramAuth(true)
  }

  // Если показываем Telegram авторизацию
  if (showTelegramAuth) {
    return (
      <div className="min-h-screen bg-mb-black text-mb-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-mb-turquoise to-mb-gold rounded-lg flex items-center justify-center mb-text-glow">
                <span className="text-mb-black font-bold text-sm">MB</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-mb-turquoise to-mb-gold bg-clip-text text-transparent">
                MB-TRUST
              </span>
            </div>
          </div>

          <TelegramAuthFlow onBack={() => setShowTelegramAuth(false)} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mb-black text-mb-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center text-sm text-mb-gray hover:text-mb-turquoise mb-4 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад на главную
          </Link>
          
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-mb-turquoise to-mb-gold rounded-lg flex items-center justify-center mb-text-glow">
              <span className="text-mb-black font-bold text-sm">MB</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-mb-turquoise to-mb-gold bg-clip-text text-transparent">
              MB-TRUST
            </span>
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Добро пожаловать</h1>
          <p className="text-mb-gray">Войдите в свой аккаунт</p>
        </div>

        {/* Sign In Form */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">Вход в аккаунт</CardTitle>
            <CardDescription className="text-center">
              Введите номер телефона и пароль
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-mb-white">Номер телефона</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-mb-gray" />
                  <Input 
                    type="tel" 
                    placeholder="+7 (999) 123-45-67" 
                    className="pl-10"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-mb-white">Пароль</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-mb-gray" />
                  <Input 
                    type="password" 
                    placeholder="Введите пароль" 
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-mb-gray/20 bg-mb-black/50 text-mb-turquoise focus:ring-mb-turquoise" />
                  <span className="text-mb-gray">Запомнить меня</span>
                </label>
                <Link href="/auth/forgot-password" className="text-mb-turquoise hover:underline">
                  Забыли пароль?
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Вход...' : 'Войти'}
              </Button>

              <div className="text-center text-sm text-mb-gray">
                <p>Нет аккаунта? <Link href="/auth/signup" className="text-mb-turquoise hover:underline">Зарегистрироваться</Link></p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Social Login */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-mb-gray/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-mb-black text-mb-gray">Или войдите через</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button variant="outline" className="w-full" disabled>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>
            <Button 
              variant="outline" 
              className="w-full hover:shadow-lg hover:shadow-mb-turquoise/50 transition-all duration-300"
              onClick={handleTelegramLogin}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.158c-.169 0-3.225 1.482-4.562 2.093-.464.195-.881.195-1.345 0-1.337-.611-4.393-2.093-4.562-2.093-.231 0-.438.207-.438.438v8.807c0 .231.207.438.438.438.169 0 3.225-1.482 4.562-2.093.464-.195.881-.195 1.345 0 1.337.611 4.393 2.093 4.562 2.093.231 0 .438-.207.438-.438V8.596c0-.231-.207-.438-.438-.438z"/>
              </svg>
              Telegram
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-mb-black text-mb-white flex items-center justify-center">
        <div className="text-mb-gray">Загрузка...</div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}