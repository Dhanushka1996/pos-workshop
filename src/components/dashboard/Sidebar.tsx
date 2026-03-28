'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingCart,
  Wrench,
  Package,
  Users,
  BarChart2,
  Settings,
  ChevronRight,
  ChevronDown,
  Layers,
  Award,
  Truck,
  Activity,
  FileSpreadsheet,
  Scissors,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface SubItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: string;
  disabled?: boolean;
  subItems?: SubItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'cashier', 'mechanic'],
  },
  {
    label: 'Point of Sale',
    href: '/dashboard/pos',
    icon: ShoppingCart,
    roles: ['admin', 'cashier'],
    disabled: true,
    badge: 'Soon',
  },
  {
    label: 'Workshop Jobs',
    href: '/dashboard/workshop',
    icon: Wrench,
    roles: ['admin', 'mechanic'],
    disabled: true,
    badge: 'Soon',
  },
  {
    label: 'Inventory',
    href: '/dashboard/inventory',
    icon: Package,
    roles: ['admin', 'cashier'],
    subItems: [
      { label: 'Overview',      href: '/dashboard/inventory',    icon: LayoutDashboard },
      { label: 'Item Master',   href: '/inventory/items',        icon: Package },
      { label: 'Receive Stock', href: '/inventory/grn',          icon: Activity },
      { label: 'Adjustments',   href: '/inventory/adjustments',  icon: Layers },
      { label: 'Suppliers',     href: '/inventory/suppliers',    icon: Truck },
      { label: 'Categories',    href: '/inventory/categories',   icon: Layers },
      { label: 'Brands',        href: '/inventory/brands',       icon: Award },
      { label: 'Import Items',  href: '/inventory/import',       icon: FileSpreadsheet },
      { label: 'Assemblies',    href: '/inventory/assemblies',   icon: Wrench },
      { label: 'Disassembly',   href: '/inventory/disassembly',  icon: Scissors },
    ],
  },
  {
    label: 'Users',
    href: '/dashboard/users',
    icon: Users,
    roles: ['admin'],
    disabled: true,
    badge: 'Soon',
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart2,
    roles: ['admin'],
    disabled: true,
    badge: 'Soon',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['admin'],
  },
];

interface SidebarProps {
  role: UserRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const isInInventory = pathname.startsWith('/dashboard/inventory') || pathname.startsWith('/inventory');
  const [inventoryOpen, setInventoryOpen] = useState(isInInventory);
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-60 shrink-0 h-[calc(100vh-4rem)] sticky top-16 border-r border-white/[0.06] bg-zinc-950/50 flex flex-col overflow-y-auto">
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Navigation
        </p>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const isSectionActive = item.subItems
            ? pathname.startsWith(item.href) || item.subItems.some(
                sub => pathname === sub.href || pathname.startsWith(sub.href + '/')
              )
            : false;

          if (item.disabled) {
            return (
              <div key={item.href} className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-600 cursor-not-allowed">
                <Icon className="size-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-500">
                    {item.badge}
                  </span>
                )}
              </div>
            );
          }

          if (item.subItems) {
            return (
              <div key={item.href}>
                <button
                  onClick={() => setInventoryOpen((o) => !o)}
                  className={cn(
                    'w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group',
                    isSectionActive
                      ? 'text-white bg-white/10'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.07]'
                  )}
                >
                  <Icon className={cn('size-4 flex-shrink-0', isSectionActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300')} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {inventoryOpen
                    ? <ChevronDown className="size-3.5 text-zinc-500" />
                    : <ChevronRight className="size-3.5 text-zinc-500" />
                  }
                </button>

                <AnimatePresence initial={false}>
                  {inventoryOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="ml-3 mt-0.5 pl-3 border-l border-white/[0.07] space-y-0.5 pb-1">
                        {item.subItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive = pathname === sub.href;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={cn(
                                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150',
                                isSubActive
                                  ? 'text-white bg-white/10 font-medium'
                                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'
                              )}
                            >
                              <SubIcon className={cn('size-3.5', isSubActive ? 'text-indigo-400' : '')} />
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group',
                  isActive
                    ? 'text-white bg-white/10'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.07]'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-white/10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                  />
                )}
                <Icon className={cn('size-4 flex-shrink-0 relative z-10', isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300')} />
                <span className="relative z-10 flex-1">{item.label}</span>
                {isActive && <ChevronRight className="size-3.5 text-zinc-500 relative z-10" />}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/[0.06]">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-white hover:bg-white/[0.07] transition-all duration-200"
        >
          <Settings className="size-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
