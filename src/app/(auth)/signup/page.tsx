import type { Metadata } from 'next';
import { SignupForm } from '@/components/auth/SignupForm';
import { Wrench } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Create Account | POS Workshop',
};

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 relative overflow-hidden px-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-mesh-gradient pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex size-14 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 items-center justify-center shadow-2xl shadow-brand-500/30 mb-4">
            <Wrench className="size-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text tracking-tight">
            POS Workshop
          </h1>
          <p className="text-zinc-500 text-sm mt-1.5">
            Create your staff account
          </p>
        </div>

        {/* Card */}
        <div className="auth-card p-7 shadow-card-dark">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Create account</h2>
            <p className="text-zinc-400 text-sm mt-1">
              Fill in your details to get started
            </p>
          </div>

          <SignupForm />
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">
          Secured with NextAuth · TLS encrypted
        </p>
      </div>
    </main>
  );
}
