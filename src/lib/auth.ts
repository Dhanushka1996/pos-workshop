import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// Works on Vercel (any deployment URL) and localhost
const secret = process.env.NEXTAUTH_SECRET ?? 'fallback-secret-change-in-prod';

export const authOptions: NextAuthOptions = {
  secret,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        if (!user.is_active) throw new Error('AccountDeactivated');

        return {
          id:        user.id,
          email:     user.email,
          name:      user.full_name,
          role:      user.role,
          is_active: user.is_active,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id        = user.id;
        token.role      = (user as any).role;
        token.is_active = (user as any).is_active;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id        = token.id        as string;
        session.user.role      = token.role      as string;
        session.user.is_active = token.is_active as boolean;
      }
      return session;
    },
  },
};
