export type UserRole = 'admin' | 'cashier' | 'mechanic';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
  permissions: string[];
}

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  admin: {
    label: 'Administrator',
    description: 'Full system access — manages users, reports & settings.',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10 border-violet-500/20',
    icon: 'Shield',
    permissions: [
      'User management',
      'Sales reports & analytics',
      'Inventory control',
      'Workshop job orders',
      'System configuration',
      'Financial overview',
    ],
  },
  cashier: {
    label: 'Cashier',
    description: 'Handles sales, billing, and customer transactions.',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10 border-sky-500/20',
    icon: 'CreditCard',
    permissions: [
      'Point of Sale',
      'Invoice generation',
      'Customer lookup',
      'Payment processing',
      'Daily sales summary',
    ],
  },
  mechanic: {
    label: 'Mechanic',
    description: 'Views and updates assigned workshop job orders.',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    icon: 'Wrench',
    permissions: [
      'View assigned jobs',
      'Update job status',
      'Parts request',
      'Time tracking',
      'Job completion notes',
    ],
  },
};
