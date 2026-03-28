# POS Workshop — Authentication & User Management Module

> Module 1 of the POS + Workshop Management System for automotive businesses.

---

## Quick Start

### 1. Install dependencies

```bash
cd pos-workshop
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste the contents of `supabase/schema.sql` → **Run**
3. In **Authentication → Settings**, set your Site URL to `http://localhost:3000`
4. Add `http://localhost:3000/auth/callback` to the **Redirect URLs** list

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in your keys from **Supabase → Project Settings → API**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Used only server-side
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

### 5. Create your first admin

1. Sign up via `/signup` using any email
2. In Supabase Dashboard → **Table Editor → profiles**
3. Find your row and set `role = 'admin'`

Or run this SQL (replace the email):

```sql
UPDATE public.profiles
SET role = 'admin', full_name = 'Super Admin'
WHERE email = 'you@example.com';
```

---

## Architecture

```
src/
├── app/
│   ├── (auth)/              # Public auth pages
│   │   ├── login/           # /login
│   │   └── signup/          # /signup
│   ├── (dashboard)/         # Protected area (middleware-guarded)
│   │   ├── layout.tsx       # Server-side auth check + layout chrome
│   │   └── dashboard/       # /dashboard + /dashboard/settings
│   ├── api/
│   │   ├── auth/profile/    # GET + PATCH own profile
│   │   └── users/           # Admin-only user listing + role updates
│   └── auth/callback/       # Supabase email confirmation handler
├── components/
│   ├── auth/                # LoginForm, SignupForm
│   ├── dashboard/           # Header, Sidebar, WelcomeBanner, cards
│   └── ui/                  # Button, Input, Select, Badge, ThemeToggle
├── hooks/useAuth.ts         # Client-side auth state + signOut
├── lib/
│   ├── supabase/            # Browser + server Supabase clients
│   ├── validations/auth.ts  # Zod schemas
│   └── utils.ts             # cn(), getInitials(), formatDate()
├── store/authStore.ts       # Zustand — profile state
└── types/index.ts           # UserRole, Profile, ROLE_CONFIG
middleware.ts                # Edge-level route protection
supabase/schema.sql          # Database schema + RLS policies
```

---

## Database Schema

| Table      | Purpose                                             |
|------------|-----------------------------------------------------|
| `profiles` | Extends `auth.users` — stores role, name, phone     |

**Roles**

| Role       | Access                                             |
|------------|----------------------------------------------------|
| `admin`    | Full system — users, reports, inventory, all POS   |
| `cashier`  | POS, invoicing, payments, customer lookup          |
| `mechanic` | View/update assigned workshop jobs, parts requests |

**Security model**
- Row Level Security (RLS) enabled on `profiles`
- Users can only read/update their own row
- Admins can read/update all rows
- Role escalation is blocked at the database level

---

## API Routes

| Method | Route                  | Auth     | Description                          |
|--------|------------------------|----------|--------------------------------------|
| GET    | `/api/auth/profile`    | Any user | Returns own profile                  |
| PATCH  | `/api/auth/profile`    | Any user | Updates own name / phone / avatar    |
| GET    | `/api/users`           | Admin    | Lists all users (paginated, filtered)|
| PATCH  | `/api/users`           | Admin    | Updates any user's role / is_active  |

---

## Tech Stack

| Layer         | Technology                        |
|---------------|-----------------------------------|
| Framework     | Next.js 14 (App Router)           |
| Styling       | Tailwind CSS + custom theme       |
| Animations    | Framer Motion                     |
| Auth          | Supabase Auth (email/password)    |
| Database      | Supabase (PostgreSQL + RLS)       |
| Forms         | React Hook Form + Zod             |
| State         | Zustand                           |
| Theme         | next-themes (dark / light)        |
| Icons         | Lucide React                      |

---

## Coming Next (Module 2+)

- [ ] Point of Sale — product search, cart, invoice, payment
- [ ] Workshop Jobs — job orders, mechanic assignment, status tracking
- [ ] Inventory — stock levels, alerts, part lookup
- [ ] Reports — daily sales, revenue analytics
- [ ] Admin User Management UI — create/deactivate staff from dashboard
