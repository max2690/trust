import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { JWT } from 'next-auth/jwt'
import type { Session, User } from 'next-auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  // НЕ ИСПОЛЬЗУЕМ PrismaAdapter с CredentialsProvider - они несовместимы!
  // adapter: undefined,
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            phone: credentials.phone
          }
        })

        if (!user) {
          return null
        }

        // Проверка блокировки пользователя
        if (user.isBlocked) {
          return null
        }

        // Проверка пароля
        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isValidPassword) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          level: user.level
        }
      }
    }),
    // Telegram авторизация через привязанный telegramId
    CredentialsProvider({
      id: 'telegram',
      name: 'Telegram',
      credentials: {
        id: { label: 'Telegram ID', type: 'text' },
        username: { label: 'Username', type: 'text' },
      },
      async authorize(credentials) {
        // Для Telegram авторизации нам достаточно telegramId, пароль не требуется
        if (!credentials?.id) {
          return null
        }

        const telegramId = credentials.id.toString()

        // Ищем пользователя с таким telegramId
        const user = await prisma.user.findUnique({
          where: { telegramId },
        })

        if (!user) {
          console.log('[AUTH] Пользователь с telegramId не найден:', telegramId)
          return null
        }

        // Проверка блокировки пользователя
        if (user.isBlocked) {
          return null
        }

        // Обновляем username если изменился
        if (credentials.username && credentials.username !== user.telegramUsername) {
          await prisma.user.update({
            where: { id: user.id },
            data: { telegramUsername: credentials.username }
          })
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          level: user.level
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 дней
    updateAge: 24 * 60 * 60, // Обновлять сессию каждые 24 часа
  },
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: (process.env.NEXTAUTH_URL || '').startsWith('https://'),
  callbacks: {
    async jwt({ token, user, trigger }): Promise<JWT> {
      // При логине сохраняем данные пользователя в токен
      if (user) {
        token.sub = user.id
        token.role = user.role
        token.level = user.level
        token.phone = user.phone
        token.email = user.email ?? null
        token.name = user.name ?? null
      }
      
      // Обновляем токен при каждом запросе (для продления сессии)
      if (trigger === 'update') {
        // Можно обновить данные из БД если нужно
      }
      
      return token
    },
    async session({ session, token }): Promise<Session> {
      // Переносим данные из токена в сессию
      if (token && session.user) {
        session.user.id = token.sub
        session.user.role = token.role
        session.user.level = token.level
        session.user.phone = token.phone
        session.user.email = token.email ?? null
        session.user.name = token.name ?? null
      }
      return session
    },
    async redirect({ url, baseUrl }): Promise<string> {
      // Если это callback URL, используем его
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Если это внешний URL с тем же origin, разрешаем
      try {
        const urlObj = new URL(url)
        if (urlObj.origin === baseUrl) return url
      } catch {
        // Если URL невалидный, возвращаем baseUrl
      }
      return baseUrl
    }
  },
  pages: {
    signIn: '/auth/signin'
  },
  // Дополнительные настройки для стабильности
  debug: process.env.NODE_ENV === 'development',
}

