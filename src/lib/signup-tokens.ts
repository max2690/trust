import { randomBytes } from 'crypto'

type SignupTokenEntry = {
  token: string
  expiresAt: number
}

const SIGNUP_TOKEN_TTL = 1000 * 60 * 60 // 1 hour
const signupTokens = new Map<string, SignupTokenEntry>()

function cleanupExpiredTokens() {
  const now = Date.now()
  for (const [userId, entry] of signupTokens.entries()) {
    if (entry.expiresAt <= now) {
      signupTokens.delete(userId)
    }
  }
}

setInterval(cleanupExpiredTokens, 60 * 1000).unref?.()

export function issueSignupToken(userId: string): string {
  const token = randomBytes(16).toString('hex')
  signupTokens.set(userId, { token, expiresAt: Date.now() + SIGNUP_TOKEN_TTL })
  return token
}

export function validateSignupToken(userId: string, token: string): boolean {
  const entry = signupTokens.get(userId)
  if (!entry) return false
  if (entry.expiresAt <= Date.now()) {
    signupTokens.delete(userId)
    return false
  }
  return entry.token === token
}


