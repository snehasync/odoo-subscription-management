import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, UserCheck, Shield, Users, Briefcase } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, quickSwitch } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
          <span className="text-xl font-black">⚡</span>
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Brightloop <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Billing Engine</span>
          </span>
          <span className="block text-[11px] text-slate-400">Subscription Lifecycle &amp; Automated Invoicing</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Quick Demo Role Switcher */}
        <div className="hidden md:flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200/60 text-xs">
          <span className="px-2 font-medium text-slate-500">Switch Role:</span>
          <button
            onClick={() => quickSwitch('ADMIN')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              user?.role === 'ADMIN'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Shield className="w-3 h-3" />
            Admin
          </button>
          <button
            onClick={() => quickSwitch('STAFF')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              user?.role === 'STAFF'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Briefcase className="w-3 h-3" />
            Staff
          </button>
          <button
            onClick={() => quickSwitch('CUSTOMER')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              user?.role === 'CUSTOMER'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3 h-3" />
            Customer
          </button>
        </div>

        {/* User Profile Badge */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-semibold text-slate-800">{user?.fullName || user?.email}</div>
            <div className="flex items-center justify-end gap-1">
              <span className="text-[10px] text-slate-400">{user?.email}</span>
              <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                user?.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' : user?.role === 'STAFF' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {user?.role}
              </span>
            </div>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold text-sm">
            {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
