'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Phone, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

import { signupSchema, type SignupInput } from '@/lib/validations/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

const ROLE_OPTIONS = [
  { value: 'cashier',  label: 'Cashier'  },
  { value: 'mechanic', label: 'Mechanic' },
  { value: 'admin',    label: 'Admin'    },
];

export function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: 'cashier' },
  });

  const onSubmit = async (data: SignupInput) => {
    setServerError('');

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setServerError(json.error ?? 'Something went wrong. Please try again.');
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4 py-6"
      >
        <div className="size-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-8 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">Account created!</h3>
          <p className="text-zinc-400 text-sm mt-1">
            Your account is ready. Sign in to get started.
          </p>
        </div>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => router.push('/login')}
        >
          Go to Sign In
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-4"
    >
      <Input
        label="Full name"
        type="text"
        placeholder="Alex Johnson"
        autoComplete="name"
        leftIcon={<User className="size-4" />}
        error={errors.full_name?.message}
        {...register('full_name')}
      />

      <Input
        label="Email address"
        type="email"
        placeholder="you@yourshop.com"
        autoComplete="email"
        leftIcon={<Mail className="size-4" />}
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Phone (optional)"
        type="tel"
        placeholder="+1 555 000 0000"
        autoComplete="tel"
        leftIcon={<Phone className="size-4" />}
        error={errors.phone?.message}
        {...register('phone')}
      />

      <Select
        label="Role"
        options={ROLE_OPTIONS}
        error={errors.role?.message}
        {...register('role')}
      />

      <Input
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="Min 8 chars, 1 uppercase, 1 number"
        autoComplete="new-password"
        leftIcon={<Lock className="size-4" />}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
        error={errors.password?.message}
        {...register('password')}
      />

      <Input
        label="Confirm password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        autoComplete="new-password"
        leftIcon={<Lock className="size-4" />}
        error={errors.confirm_password?.message}
        {...register('confirm_password')}
      />

      {serverError && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400"
        >
          {serverError}
        </motion.div>
      )}

      <Button
        type="submit"
        size="lg"
        loading={isSubmitting}
        className="w-full !mt-6"
      >
        Create account
      </Button>

      <p className="text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </motion.form>
  );
}
