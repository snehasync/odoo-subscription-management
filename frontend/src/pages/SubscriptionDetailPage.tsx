import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Subscription } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  User,
  Package,
  Layers,
  History,
  Receipt,
  CheckCircle,
  AlertTriangle,
  Send,
} from 'lucide-react';

interface SubscriptionDetailPageProps {
  subscriptionId: string;
  onBack: () => void;
  onSelectInvoice?: (invoiceId: string) => void;
}

export const SubscriptionDetailPage: React.FC<SubscriptionDetailPageProps> = ({
  subscriptionId,
  onBack,
  onSelectInvoice,
}) => {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');
  const [transitionReason, setTransitionReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDetail = async () => {
    setLoading(true);
    const res = await api.get<Subscription>(`/subscriptions/${subscriptionId}`);
    if (res.success && res.data) {
      setSub(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDetail();
  }, [subscriptionId]);

  if (loading || !sub) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // Valid status transitions
  const transitionsMap: Record<string, string[]> = {
    DRAFT: ['QUOTATION', 'CLOSED'],
    QUOTATION: ['CONFIRMED', 'DRAFT', 'CLOSED'],
    CONFIRMED: ['ACTIVE', 'CLOSED'],
    ACTIVE: ['CLOSED'],
    CLOSED: sub.plan.allowRenewal ? ['ACTIVE', 'DRAFT'] : [],
  };

  const allowedTransitions = transitionsMap[sub.status] || [];

  const handleOpenTransition = (status: string) => {
    setTargetStatus(status);
    setTransitionReason('');
    setErrorMessage(null);
    setIsTransitionModalOpen(true);
  };

  const handleExecuteTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransitioning(true);
    setErrorMessage(null);

    const res = await api.post(`/subscriptions/${sub.id}/transition`, {
      toStatus: targetStatus,
      reason: transitionReason || `Transitioned to ${targetStatus}`,
    });

    setTransitioning(false);

    if (res.success) {
      setIsTransitionModalOpen(false);
      fetchDetail();
    } else {
      setErrorMessage(res.error?.message || 'Status transition failed.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Navigation & Status Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Subscriptions
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {allowedTransitions.map((nextStatus) => (
            <button
              key={nextStatus}
              onClick={() => handleOpenTransition(nextStatus)}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-100 hover:border-blue-300 transition-all"
            >
              Transition to {nextStatus}
            </button>
          ))}
        </div>
      </div>

      {/* Main Info Hero Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900">{sub.subscriptionNumber}</h1>
              <StatusBadge status={sub.status} />
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Customer:{' '}
              <span className="font-semibold text-slate-800">{sub.customer.name}</span>{' '}
              {sub.customer.company && `(${sub.customer.company})`} — {sub.customer.email}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-3">
              <span className="text-slate-400 block font-medium">Plan</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">{sub.plan.name}</span>
              <span className="text-slate-500 text-[11px]">${sub.plan.price} / {sub.plan.billingPeriod.toLowerCase()}</span>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-3">
              <span className="text-slate-400 block font-medium">Payment Terms</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">{sub.paymentTerms}</span>
              <span className="text-slate-500 text-[11px]">Next: {new Date(sub.nextBillingDate).toISOString().slice(0, 10)}</span>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-3">
              <span className="text-slate-400 block font-medium">Contract Period</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                {new Date(sub.startDate).toISOString().slice(0, 10)}
              </span>
              <span className="text-slate-500 text-[11px]">to {new Date(sub.expiryDate).toISOString().slice(0, 10)}</span>
            </div>
          </div>
        </div>

        {sub.notes && (
          <div className="mt-4 rounded-xl bg-blue-50/50 border border-blue-100 p-3 text-xs text-blue-900">
            <strong>Notes:</strong> {sub.notes}
          </div>
        )}
      </div>

      {/* Line Items Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">Contract Line Items &amp; Pricing</h2>
          </div>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
            <tr>
              <th className="py-3 px-6">Product / Service</th>
              <th className="py-3 px-6 text-center">Qty</th>
              <th className="py-3 px-6 text-right">Unit Price</th>
              <th className="py-3 px-6 text-right">Tax Rate</th>
              <th className="py-3 px-6 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sub.lines.map((line) => (
              <tr key={line.id} className="hover:bg-slate-50/50">
                <td className="py-3.5 px-6">
                  <div className="font-semibold text-slate-800">{line.product?.name || 'Custom Line'}</div>
                  {line.variant && (
                    <div className="text-[11px] text-slate-500">Variant: {line.variant.name} (+${line.variant.priceAdjustment})</div>
                  )}
                </td>
                <td className="py-3.5 px-6 text-center font-medium">{line.quantity}</td>
                <td className="py-3.5 px-6 text-right font-mono">${line.unitPrice.toFixed(2)}</td>
                <td className="py-3.5 px-6 text-right font-mono">{line.taxRate}%</td>
                <td className="py-3.5 px-6 text-right font-mono font-bold text-slate-900">
                  ${line.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Generated Invoices for this Subscription */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">Generated Recurring Invoices</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {sub.invoices?.length || 0} Invoices Billed
          </span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
            <tr>
              <th className="py-3 px-6">Invoice #</th>
              <th className="py-3 px-6">Billing Period</th>
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-6">Issue Date</th>
              <th className="py-3 px-6">Due Date</th>
              <th className="py-3 px-6 text-right">Total Amount</th>
              <th className="py-3 px-6 text-right">Paid Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!sub.invoices || sub.invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No invoices generated yet for this subscription cycle.
                </td>
              </tr>
            ) : (
              sub.invoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => onSelectInvoice && onSelectInvoice(inv.id)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-6 font-bold text-blue-600">{inv.invoiceNumber}</td>
                  <td className="py-3.5 px-6 font-mono text-slate-700">{inv.billingPeriod}</td>
                  <td className="py-3.5 px-6">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="py-3.5 px-6 text-slate-600">
                    {new Date(inv.issuedDate).toISOString().slice(0, 10)}
                  </td>
                  <td className="py-3.5 px-6 text-slate-600">
                    {new Date(inv.dueDate).toISOString().slice(0, 10)}
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono font-bold text-slate-900">
                    ${inv.totalAmount.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono font-semibold text-emerald-600">
                    ${inv.paidAmount.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Chronological Status Audit Timeline */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-slate-600" />
          <h2 className="text-sm font-bold text-slate-900">Chronological Status History Audit</h2>
        </div>

        <div className="relative border-l-2 border-slate-100 ml-4 space-y-6 pb-2">
          {sub.statusHistory?.map((hist) => (
            <div key={hist.id} className="relative pl-6">
              <div className="absolute -left-[9px] top-0.5 h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-sm" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">
                    {hist.fromStatus} → {hist.toStatus}
                  </span>
                  {hist.reason && <span className="text-slate-600 block mt-0.5">"{hist.reason}"</span>}
                </div>
                <div className="mt-1 sm:mt-0 text-right text-[11px] text-slate-400">
                  <span>{new Date(hist.createdAt).toLocaleString()}</span>
                  {hist.changedBy && (
                    <span className="block text-slate-500 font-medium">by {hist.changedBy.fullName} ({hist.changedBy.role})</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal for Status Transition */}
      <Modal
        isOpen={isTransitionModalOpen}
        onClose={() => setIsTransitionModalOpen(false)}
        title={`Transition Status to ${targetStatus}`}
      >
        <form onSubmit={handleExecuteTransition} className="space-y-4 text-xs">
          <p className="text-slate-600">
            You are about to change the status of <strong>{sub.subscriptionNumber}</strong> from{' '}
            <span className="font-bold text-slate-800">{sub.status}</span> to{' '}
            <span className="font-bold text-blue-600">{targetStatus}</span>.
          </p>

          {errorMessage && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4" />
                Transition Denied
              </div>
              <p className="mt-1">{errorMessage}</p>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Audit Reason / Note *
            </label>
            <input
              type="text"
              required
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              placeholder="e.g. Customer signed master service agreement"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTransitionModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={transitioning}
              className="px-5 py-2 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-60"
            >
              {transitioning ? 'Executing...' : `Confirm Transition to ${targetStatus}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
