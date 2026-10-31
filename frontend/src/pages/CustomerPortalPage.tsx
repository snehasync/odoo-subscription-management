import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Subscription, Invoice } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  Sparkles,
  Repeat,
  Receipt,
  Printer,
  CreditCard,
  KeyRound,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';

export const CustomerPortalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'invoices' | 'security'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Pay Modal
  const [payInvoiceModal, setPayInvoiceModal] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '4242 •••• •••• 4242',
    expDate: '12/28',
    cvv: '999',
  });
  const [processingPayment, setProcessingPayment] = useState(false);

  // Password Change Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fetchPortalData = async () => {
    setLoading(true);
    const [subRes, invRes, profRes] = await Promise.all([
      api.get<Subscription[]>('/portal/subscriptions'),
      api.get<Invoice[]>('/portal/invoices'),
      api.get<any>('/portal/profile'),
    ]);

    if (subRes.success && subRes.data) setSubscriptions(subRes.data);
    if (invRes.success && invRes.data) setInvoices(invRes.data);
    if (profRes.success && profRes.data) setProfile(profRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  const handleOpenPayModal = (inv: Invoice) => {
    const balance = Math.max(0, inv.totalAmount - inv.paidAmount);
    setPayInvoiceModal(inv);
    setPayAmount(balance);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvoiceModal) return;

    setProcessingPayment(true);
    const res = await api.post(`/portal/invoices/${payInvoiceModal.id}/pay`, {
      amount: payAmount,
      paymentMethod: 'CREDIT_CARD',
      reference: `PORTAL-CARD-${Date.now().toString().slice(-6)}`,
    });
    setProcessingPayment(false);

    if (res.success) {
      setPayInvoiceModal(null);
      fetchPortalData();
    } else {
      alert(`Payment failed: ${res.error?.message || 'Error'}`);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);
    setPasswordError(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    const res = await api.post('/portal/change-password', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });

    if (res.success) {
      setPasswordNotice('Your password has been changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      setPasswordError(res.error?.message || 'Password update failed.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const outstandingTotal = invoices
    .filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED')
    .reduce((acc, curr) => acc + Math.max(0, curr.totalAmount - curr.paidAmount), 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Welcome Hero */}
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-blue-900 to-indigo-900 p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Customer Self-Service Hub
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-1">
              Welcome back, {profile?.customer?.name || profile?.user?.fullName}!
            </h1>
            <p className="text-blue-100 text-xs mt-1">
              Manage your active service subscriptions, review invoice statements, and settle outstanding balances.
            </p>
          </div>

          <div className="rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-4 text-right">
            <span className="text-[11px] uppercase tracking-wider text-blue-200 block font-medium">Outstanding Balance</span>
            <span className="text-2xl font-black text-white mt-0.5 block">
              ${outstandingTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold text-slate-500">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === 'subscriptions'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Repeat className="w-4 h-4" />
          My Subscriptions ({subscriptions.length})
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === 'invoices'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          My Invoices &amp; Receipts ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === 'security'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Security &amp; Password
        </button>
      </div>

      {/* Tab: Subscriptions */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          {subscriptions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
              No subscriptions found under your account.
            </div>
          ) : (
            subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:border-blue-200 transition-colors"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-lg text-slate-900">{sub.subscriptionNumber}</span>
                      <StatusBadge status={sub.status} />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Plan: <strong className="text-slate-800">{sub.plan?.name}</strong> (${sub.plan?.price.toFixed(2)} / {sub.plan?.billingPeriod.toLowerCase()})
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="text-slate-400 block font-medium">Next Renewal Billing</span>
                    <span className="font-bold text-slate-800 text-sm font-mono">
                      {new Date(sub.nextBillingDate).toISOString().slice(0, 10)}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-bold text-slate-700 mb-2">Included Products &amp; Services</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sub.lines.map((line) => (
                      <div key={line.id} className="rounded-xl bg-slate-50 border border-slate-200/60 p-3 text-xs flex justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">{line.product?.name}</div>
                          {line.variant && <div className="text-[11px] text-slate-500">Variant: {line.variant.name}</div>}
                        </div>
                        <div className="text-right font-mono font-bold text-slate-800">
                          {line.quantity}x @ ${line.unitPrice.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex justify-between items-center text-xs text-slate-400 border-t border-slate-100 pt-3">
                  <span>Contract Valid: {new Date(sub.startDate).toLocaleDateString()} — {new Date(sub.expiryDate).toLocaleDateString()}</span>
                  <span>Terms: {sub.paymentTerms}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Invoices */}
      {activeTab === 'invoices' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Invoice #</th>
                <th className="py-3 px-5">Billing Period</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Issue / Due Date</th>
                <th className="py-3 px-5 text-right">Total ($)</th>
                <th className="py-3 px-5 text-right">Balance Due ($)</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No invoices generated yet for your account.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const balance = Math.max(0, inv.totalAmount - inv.paidAmount);
                  const isOverdue = inv.status !== 'PAID' && new Date() > new Date(inv.dueDate);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-5 font-bold text-blue-600">{inv.invoiceNumber}</td>
                      <td className="py-3.5 px-5 font-mono text-slate-600">{inv.billingPeriod}</td>
                      <td className="py-3.5 px-5">
                        <StatusBadge status={inv.status} isOverdue={isOverdue} />
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="text-slate-700">{new Date(inv.issuedDate).toLocaleDateString()}</div>
                        <div className={`text-[10px] ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                          Due: {new Date(inv.dueDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900">
                        ${inv.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-rose-600">
                        ${balance.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => window.open(`/api/invoices/${inv.id}/print`, '_blank')}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            PDF / Print
                          </button>

                          {balance > 0 && inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleOpenPayModal(inv)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              Pay Now
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Security & Password */}
      {activeTab === 'security' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm max-w-xl">
          <h2 className="text-base font-bold text-slate-900 mb-1">Update Security Password</h2>
          <p className="text-xs text-slate-500 mb-6">
            Passwords must contain more than 8 characters, with at least one uppercase letter, one lowercase letter, and one special character.
          </p>

          {passwordNotice && (
            <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{passwordNotice}</span>
            </div>
          )}

          {passwordError && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Current Password *</label>
              <input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">New Secure Password *</label>
              <input
                type="password"
                required
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                placeholder="At least 9 characters with uppercase, lowercase, special char"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pay Invoice Online Modal */}
      <Modal
        isOpen={Boolean(payInvoiceModal)}
        onClose={() => setPayInvoiceModal(null)}
        title={payInvoiceModal ? `Settle Invoice ${payInvoiceModal.invoiceNumber}` : 'Pay Invoice'}
      >
        {payInvoiceModal && (
          <form onSubmit={handleProcessPayment} className="space-y-4 text-xs">
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
              <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                <span>Invoice Total:</span>
                <span>${payInvoiceModal.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-rose-600 font-bold mt-1">
                <span>Current Outstanding Due:</span>
                <span>
                  ${Math.max(0, payInvoiceModal.totalAmount - payInvoiceModal.paidAmount).toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={Math.max(0, payInvoiceModal.totalAmount - payInvoiceModal.paidAmount)}
                required
                value={payAmount}
                onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 font-mono text-sm font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Simulated Card Number</label>
              <input
                type="text"
                disabled
                value={cardDetails.cardNumber}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expiration</label>
                <input
                  type="text"
                  disabled
                  value={cardDetails.expDate}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">CVC</label>
                <input
                  type="text"
                  disabled
                  value={cardDetails.cvv}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPayInvoiceModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processingPayment}
                className="px-5 py-2 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20 disabled:opacity-60"
              >
                {processingPayment ? 'Authorizing Payment...' : `Confirm Payment ($${payAmount.toFixed(2)})`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
