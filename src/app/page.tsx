import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
console.log("SECRET:", process.env.af1307a4a872d9276a29e50be24764df);
export default async function RootPage() {
  const session = await getServerSession(authOptions);
  redirect(session ? '/dashboard' : '/login');
}
