import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Repeat,
  Receipt,
  CreditCard,
  Users,
  Settings2,
  FileClock,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isCustomer = user?.role === 'CUSTOMER';

  if (isCustomer) {
    return (
      <aside className="w-64 border-r border-slate-200/80 bg-white p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-1">
          <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Customer Self-Service
          </div>

          <button
            onClick={() => onSelectTab('portal')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              currentTab === 'portal'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            My Subscriptions &amp; Invoices
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Customer Portal</p>
          <p className="mt-1">Inspect your active contracts, download receipts, pay overdue invoices, and change security credentials.</p>
        </div>
      </aside>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'subscriptions', label: 'Subscriptions & Quotes', icon: Repeat },
    { id: 'invoices', label: 'Invoices & Billing', icon: Receipt },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'customers', label: 'Customers', icon: Users },
  ];

  if (isAdmin) {
    navItems.push(
      { id: 'catalog', label: 'Products & Pricing Rules', icon: Settings2 },
      { id: 'audit-logs', label: 'Security Audit Logs', icon: FileClock }
    );
  }

  return (
    <aside className="w-64 border-r border-slate-200/80 bg-white p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        <div>
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Main Management
          </div>
          <div className="mt-2 space-y-1">
            {navItems.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {isAdmin && (
          <div>
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Admin Configuration
            </div>
            <div className="mt-2 space-y-1">
              {navItems.slice(5).map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-blue-900">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          Billing Engine Active
        </div>
        <p className="mt-1 text-slate-500 text-[11px]">
          Nightly cron job runs daily at 00:00 UTC. Safe &amp; idempotent.
        </p>
      </div>
    </aside>
  );
};
