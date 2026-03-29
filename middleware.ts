import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*'],
};
