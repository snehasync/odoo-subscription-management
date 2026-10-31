import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Payment, Invoice } from '../types';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { Plus, CreditCard, DollarSign, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface PaymentsPageProps {
  initialInvoiceForPayment?: Invoice | null;
  onClearInitialInvoice?: () => void;
}

export const PaymentsPage: React.FC<PaymentsPageProps> = ({
  initialInvoiceForPayment,
  onClearInitialInvoice,
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // New Payment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invoicesToPay, setInvoicesToPay] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [formData, setFormData] = useState({
    invoiceId: '',
    amount: 0,
    paymentMethod: 'CREDIT_CARD',
    paymentDate: new Date().toISOString().slice(0, 10),
    reference: '',
    notes: '',
  });

  const [notice, setNotice] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    const res = await api.get<Payment[]>(`/payments?page=${page}&limit=20`);
    if (res.success && res.data) {
      setPayments(res.data);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages);
        setTotalItems(res.pagination.total);
      }
    }
    setLoading(false);
  };

  const loadUnpaidInvoices = async () => {
    const res = await api.get<Invoice[]>('/invoices?status=ALL&limit=100');
    if (res.success && res.data) {
      // Filter out already PAID and CANCELLED invoices
      const unpaid = res.data.filter((inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED');
      setInvoicesToPay(unpaid);
    }
  };

  useEffect(() => {
    fetchPayments();
    loadUnpaidInvoices();
  }, [page]);

  useEffect(() => {
    if (initialInvoiceForPayment) {
      const outstanding = Math.max(
        0,
        initialInvoiceForPayment.totalAmount - initialInvoiceForPayment.paidAmount
      );
      setSelectedInvoice(initialInvoiceForPayment);
      setFormData({
        invoiceId: initialInvoiceForPayment.id,
        amount: outstanding,
        paymentMethod: 'CREDIT_CARD',
        paymentDate: new Date().toISOString().slice(0, 10),
        reference: `PAY-${Date.now().toString().slice(-6)}`,
        notes: 'Invoice payment',
      });
      setIsModalOpen(true);
      if (onClearInitialInvoice) onClearInitialInvoice();
    }
  }, [initialInvoiceForPayment]);

  const handleInvoiceSelect = (invId: string) => {
    const found = invoicesToPay.find((i) => i.id === invId);
    setSelectedInvoice(found || null);
    if (found) {
      const outstanding = Math.max(0, found.totalAmount - found.paidAmount);
      setFormData({
        ...formData,
        invoiceId: found.id,
        amount: outstanding,
      });
    } else {
      setFormData({ ...formData, invoiceId: '', amount: 0 });
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/payments', formData);
    if (res.success) {
      setIsModalOpen(false);
      setNotice('Payment recorded successfully. Invoice balance updated.');
      fetchPayments();
      loadUnpaidInvoices();
    } else {
      alert(`Error recording payment: ${res.error?.message || 'Failed'}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Payments &amp; Settlements</h1>
          <p className="text-sm text-slate-500">
            Record full and partial customer remittances with automated invoice balance settlements.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedInvoice(null);
            setFormData({
              invoiceId: '',
              amount: 0,
              paymentMethod: 'CREDIT_CARD',
              paymentDate: new Date().toISOString().slice(0, 10),
              reference: `TX-${Date.now().toString().slice(-6)}`,
              notes: '',
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Record New Payment
        </button>
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-medium text-emerald-900 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-emerald-700 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Payment Date</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Invoice #</th>
                <th className="py-3 px-5">Method</th>
                <th className="py-3 px-5">Reference</th>
                <th className="py-3 px-5">Recorded By</th>
                <th className="py-3 px-5 text-right">Amount ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                      Loading payment records...
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-5 font-mono text-slate-600">
                      {new Date(p.paymentDate).toISOString().slice(0, 10)}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-slate-900">
                      {p.invoice?.customer?.name || 'Customer'}
                    </td>
                    <td className="py-3.5 px-5 font-mono font-bold text-blue-600">
                      {p.invoice?.invoiceNumber || '-'}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-slate-500">
                      {p.reference || '-'}
                    </td>
                    <td className="py-3.5 px-5 text-slate-500">
                      {p.createdBy?.fullName || 'Staff Member'}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-600 text-sm">
                      +${p.amount.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={20}
          onPageChange={setPage}
        />
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Payment Remittance"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Invoice to Settle *</label>
            <select
              required
              value={formData.invoiceId}
              onChange={(e) => handleInvoiceSelect(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Select Unpaid Invoice...</option>
              {invoicesToPay.map((inv) => {
                const bal = Math.max(0, inv.totalAmount - inv.paidAmount);
                return (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — {inv.customer?.name} (Total: ${inv.totalAmount.toFixed(2)}, Due: ${bal.toFixed(2)})
                  </option>
                );
              })}
            </select>
          </div>

          {selectedInvoice && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex justify-between">
              <div>
                <span className="text-slate-500">Total Invoiced:</span>{' '}
                <strong className="text-slate-800">${selectedInvoice.totalAmount.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Already Paid:</span>{' '}
                <strong className="text-emerald-600">${selectedInvoice.paidAmount.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Remaining Balance:</span>{' '}
                <strong className="text-rose-600">
                  ${Math.max(0, selectedInvoice.totalAmount - selectedInvoice.paidAmount).toFixed(2)}
                </strong>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 font-mono text-sm font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Method *</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              >
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="BANK_TRANSFER">Bank Wire / ACH</option>
                <option value="STRIPE">Stripe Payment</option>
                <option value="CHECK">Paper Check</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Date *</label>
              <input
                type="date"
                required
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Transaction Reference</label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="e.g. Wire confirmation / check #"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Internal Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Received via customer AP portal"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
            >
              Post Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
