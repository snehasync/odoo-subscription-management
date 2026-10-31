import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { DashboardStats } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  TrendingUp,
  DollarSign,
  AlertCircle,
  Repeat,
  Download,
  Play,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningJob, setRunningJob] = useState(false);
  const [jobNotice, setJobNotice] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    const res = await api.get<DashboardStats>('/reports/stats');
    if (res.success && res.data) {
      setStats(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRunBilling = async () => {
    setRunningJob(true);
    setJobNotice(null);
    const res = await api.post('/invoices/generate-due', {});
    setRunningJob(false);
    if (res.success) {
      setJobNotice(res.message || 'Billing run finished successfully.');
      fetchStats();
    } else {
      setJobNotice(`Billing error: ${res.error?.message || 'Failed'}`);
    }
  };

  const handleExportCsv = (type: string) => {
    window.open(`/api/reports/export-csv?type=${type}`, '_blank');
  };

  if (loading && !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const metrics = stats?.metrics;
  const statusDist = stats?.statusDistribution || {};

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Revenue &amp; Operations Dashboard</h1>
          <p className="text-sm text-slate-500">Live aggregate metrics computed across active contracts and billing cycles.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleExportCsv('invoices')}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Invoices CSV
          </button>

          <button
            onClick={handleRunBilling}
            disabled={runningJob}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition-all"
          >
            <Play className={`w-3.5 h-3.5 ${runningJob ? 'animate-spin' : ''}`} />
            {runningJob ? 'Executing Billing Run...' : 'Run Automated Billing Now'}
          </button>
        </div>
      </div>

      {/* Notification banner for job execution */}
      {jobNotice && (
        <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 p-4 text-xs font-medium text-blue-900 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>{jobNotice}</span>
          </div>
          <button onClick={() => setJobNotice(null)} className="text-blue-500 hover:text-blue-700 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* MRR */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Monthly Recurring Revenue (MRR)</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-900">
              ${(metrics?.mrr || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-emerald-600">ARR: ${(metrics?.arr || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span>annualized run-rate</span>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Active Subscriptions</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-900">
              {(metrics?.activeSubscriptionsCount || 0).toLocaleString()}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Out of {(metrics?.totalSubscriptions || 0).toLocaleString()} total contracts
          </div>
        </div>

        {/* Revenue Collected */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Revenue Collected</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-emerald-600">
              ${(metrics?.revenueCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Total invoiced: ${(metrics?.totalInvoiced || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Amount Outstanding & Overdue */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Outstanding Balance</span>
            <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-rose-600">
              ${(metrics?.amountOutstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-rose-600 font-medium">
            {(metrics?.overdueCount || 0)} overdue invoices (${(metrics?.overdueAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })})
          </div>
        </div>
      </div>

      {/* Subscription Status Pipeline Breakdown */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-4">
          Subscription Pipeline Lifecycle Distribution
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-center">
            <div className="text-xs font-semibold text-slate-500">Draft</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{statusDist['DRAFT'] || 0}</div>
          </div>
          <div className="rounded-xl bg-purple-50 border border-purple-200 p-3.5 text-center">
            <div className="text-xs font-semibold text-purple-700">Quotation</div>
            <div className="text-2xl font-black text-purple-800 mt-1">{statusDist['QUOTATION'] || 0}</div>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-center">
            <div className="text-xs font-semibold text-blue-700">Confirmed</div>
            <div className="text-2xl font-black text-blue-800 mt-1">{statusDist['CONFIRMED'] || 0}</div>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-center">
            <div className="text-xs font-semibold text-emerald-700">Active</div>
            <div className="text-2xl font-black text-emerald-800 mt-1">{statusDist['ACTIVE'] || 0}</div>
          </div>
          <div className="rounded-xl bg-zinc-100 border border-zinc-300 p-3.5 text-center">
            <div className="text-xs font-semibold text-zinc-600">Closed</div>
            <div className="text-2xl font-black text-zinc-700 mt-1">{statusDist['CLOSED'] || 0}</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Overdue Invoices & Recent Payments */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Overdue Invoices Alert Table */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-rose-50/30">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">Overdue Invoices Requiring Follow-Up</h2>
            </div>
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
              {stats?.overdueInvoices.length || 0} Listed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Invoice</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.overdueInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No overdue invoices found. All payments are up to date!
                    </td>
                  </tr>
                ) : (
                  stats?.overdueInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-blue-600">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{inv.customerName}</div>
                        <div className="text-[10px] text-slate-400">{inv.customerEmail}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                          <Clock className="w-3 h-3" />
                          {inv.daysOverdue}d overdue
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600">
                        ${inv.balanceDue.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments Feed */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Payment Transactions</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Invoice</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  stats?.recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {p.customerName}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {p.invoiceNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        +${p.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
