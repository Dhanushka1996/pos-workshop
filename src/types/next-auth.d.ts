import 'next-auth';
import 'next-auth/jwt';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

declare module 'next-auth' {
  interface Session {
    user: {
      id:        string;
      email:     string;
      name?:     string | null;
      role:      string;
      is_active: boolean;
    };
  }
  interface User {
    role:      string;
    is_active: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id:        string;
    role:      string;
    is_active: boolean;
  }
}
