import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const rawUrl = process.env.DATABASE_URL

if (!rawUrl) {
  throw new Error(
    '[prisma.ts] DATABASE_URL is not set. ' +
    'Go to Vercel → your project → Settings → Environment Variables and add DATABASE_URL.'
  )
}

// Detect if user accidentally set the direct Supabase URL (port 5432) instead of the pooler URL.
// Vercel serverless functions cannot reach port 5432 on Supabase.
const isDirectSupabase =
  rawUrl.includes(':5432') &&
  rawUrl.includes('supabase.co') &&
  !rawUrl.includes('pooler')

if (isDirectSupabase) {
  throw new Error(
    '[prisma.ts] DATABASE_URL is set to the Supabase DIRECT connection (port 5432). ' +
    'Vercel serverless functions cannot reach this. ' +
    'You must use the Supabase CONNECTION POOLER URL instead:\n' +
    '  1. Go to Supabase → your project → Project Settings → Database\n' +
    '  2. Scroll to "Connection string" section\n' +
    '  3. Select "Transaction" mode (NOT "Direct connection")\n' +
    '  4. Copy the URI — it should contain "pooler.supabase.com" and port 6543\n' +
    '  5. Append ?pgbouncer=true to the end if not already present\n' +
    '  6. Paste that as DATABASE_URL in Vercel → Settings → Environment Variables\n' +
    '  7. Make sure to select ALL environments (Production, Preview, Development)\n' +
    '  8. Redeploy.'
  )
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: rawUrl,
      },
    },
    log:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
