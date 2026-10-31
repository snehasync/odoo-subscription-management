import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Invoice } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Mail,
  Printer,
  DollarSign,
  Play,
  Eye,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface InvoicesPageProps {
  onRecordPaymentForInvoice?: (invoice: Invoice) => void;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({ onRecordPaymentForInvoice }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Invoice Detail Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Job trigger state
  const [runningJob, setRunningJob] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    let url = `/invoices?page=${page}&limit=20`;
    if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res = await api.get<Invoice[]>(url);
    if (res.success && res.data) {
      setInvoices(res.data);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages);
        setTotalItems(res.pagination.total);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  const handleConfirm = async (id: string) => {
    const res = await api.post(`/invoices/${id}/confirm`);
    if (res.success) {
      setActionNotice('Invoice confirmed successfully.');
      fetchInvoices();
      if (selectedInvoice?.id === id) openInvoiceDetail(id);
    } else {
      alert(`Error: ${res.error?.message}`);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this invoice?')) return;
    const res = await api.post(`/invoices/${id}/cancel`);
    if (res.success) {
      setActionNotice('Invoice cancelled.');
      fetchInvoices();
      if (selectedInvoice?.id === id) openInvoiceDetail(id);
    } else {
      alert(`Error: ${res.error?.message}`);
    }
  };

  const handleSendEmail = async (id: string) => {
    const res = await api.post(`/invoices/${id}/send`);
    if (res.success) {
      setActionNotice(res.message || 'Invoice email dispatched to customer.');
      fetchInvoices();
    } else {
      alert(`Error: ${res.error?.message}`);
    }
  };

  const openInvoiceDetail = async (id: string) => {
    setLoadingDetail(true);
    const res = await api.get<Invoice>(`/invoices/${id}`);
    if (res.success && res.data) {
      setSelectedInvoice(res.data);
    }
    setLoadingDetail(false);
  };

  const handleRunBillingNow = async () => {
    setRunningJob(true);
    setActionNotice(null);
    const res = await api.post('/invoices/generate-due');
    setRunningJob(false);
    if (res.success) {
      setActionNotice(res.message || 'Billing job completed.');
      fetchInvoices();
    } else {
      alert(`Billing run error: ${res.error?.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Invoices &amp; Billing Cycles</h1>
          <p className="text-sm text-slate-500">
            Automated recurring invoices, tax snapshots, payment settlement, and customer dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunBillingNow}
            disabled={runningJob}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 disabled:opacity-60 transition-all"
          >
            <Play className={`w-3.5 h-3.5 ${runningJob ? 'animate-spin' : ''}`} />
            {runningJob ? 'Executing Billing...' : 'Run Automated Invoicing Now'}
          </button>
        </div>
      </div>

      {/* Action Notice */}
      {actionNotice && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-medium text-emerald-900 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-600 hover:text-emerald-800 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Filter */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice #, customer name, email..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Invoice #</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Period</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Issue / Due Date</th>
                <th className="py-3 px-5 text-right">Total ($)</th>
                <th className="py-3 px-5 text-right">Paid ($)</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                      Loading invoices...
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isOverdue = inv.status !== 'PAID' && new Date() > new Date(inv.dueDate);
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => openInvoiceDetail(inv.id)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-5 font-bold text-blue-600">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-slate-900">{inv.customer?.name}</div>
                        <div className="text-[11px] text-slate-400">{inv.customer?.email}</div>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-slate-600">{inv.billingPeriod}</td>
                      <td className="py-3.5 px-5">
                        <StatusBadge status={inv.status} isOverdue={isOverdue} />
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="text-slate-700">{new Date(inv.issuedDate).toISOString().slice(0, 10)}</div>
                        <div className={`text-[11px] ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                          Due: {new Date(inv.dueDate).toISOString().slice(0, 10)}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900">
                        ${inv.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-semibold text-emerald-600">
                        ${inv.paidAmount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => window.open(`/api/invoices/${inv.id}/print`, '_blank')}
                            title="Print / Save PDF"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSendEmail(inv.id)}
                            title="Dispatch Email"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          {inv.status === 'DRAFT' && (
                            <button
                              onClick={() => handleConfirm(inv.id)}
                              title="Confirm Invoice"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 font-semibold"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && onRecordPaymentForInvoice && (
                            <button
                              onClick={() => onRecordPaymentForInvoice(inv)}
                              title="Record Payment"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 font-semibold"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
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

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={20}
          onPageChange={setPage}
        />
      </div>

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title={selectedInvoice ? `Invoice ${selectedInvoice.invoiceNumber}` : 'Invoice Detail'}
        maxWidth="max-w-3xl"
      >
        {selectedInvoice && (
          <div className="space-y-6 text-xs">
            {/* Header info */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">{selectedInvoice.invoiceNumber}</h3>
                  <StatusBadge status={selectedInvoice.status} isOverdue={selectedInvoice.isOverdue} />
                </div>
                <div className="text-slate-500 mt-1">
                  Billed to: <strong className="text-slate-800">{selectedInvoice.customer.name}</strong> ({selectedInvoice.customer.email})
                </div>
              </div>

              <div className="text-right">
                <div className="text-slate-500">Billing Period: <span className="font-mono font-bold text-slate-800">{selectedInvoice.billingPeriod}</span></div>
                <div className="text-slate-500 mt-1">Due Date: <span className="font-semibold text-slate-800">{new Date(selectedInvoice.dueDate).toISOString().slice(0, 10)}</span></div>
              </div>
            </div>

            {/* Lines Table */}
            <div>
              <div className="font-bold text-slate-800 mb-2">Invoice Line Items</div>
              <table className="w-full text-left border border-slate-100 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Tax</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{l.description}</td>
                      <td className="py-2.5 px-3 text-center">{l.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono">${l.unitPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">${l.taxAmount.toFixed(2)} ({l.taxRate}%)</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">${l.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="ml-auto w-72 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">${selectedInvoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax Total:</span>
                <span className="font-mono font-medium">${selectedInvoice.taxTotal.toFixed(2)}</span>
              </div>
              {selectedInvoice.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount Applied:</span>
                  <span className="font-mono">-${selectedInvoice.discountTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-1.5">
                <span>Total Amount:</span>
                <span className="font-mono">${selectedInvoice.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Amount Paid:</span>
                <span className="font-mono">${selectedInvoice.paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold border-t border-slate-100 pt-1">
                <span>Outstanding Balance:</span>
                <span className="font-mono">
                  ${Math.max(0, selectedInvoice.totalAmount - selectedInvoice.paidAmount).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payments History */}
            {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <div className="font-bold text-slate-800 mb-2">Recorded Payments</div>
                <div className="space-y-2">
                  {selectedInvoice.payments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center rounded-xl bg-slate-50 p-2.5">
                      <div>
                        <span className="font-bold text-slate-800">${p.amount.toFixed(2)}</span> via{' '}
                        <span className="font-semibold text-slate-600">{p.paymentMethod}</span>{' '}
                        {p.reference && <span className="text-slate-400 font-mono">({p.reference})</span>}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.open(`/api/invoices/${selectedInvoice.id}/print`, '_blank')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / View HTML
                </button>
                <button
                  type="button"
                  onClick={() => handleSendEmail(selectedInvoice.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Send Email
                </button>
              </div>

              <div className="flex gap-2">
                {selectedInvoice.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => handleConfirm(selectedInvoice.id)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm"
                  >
                    Confirm Invoice
                  </button>
                )}
                {selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'CANCELLED' && (
                  <button
                    type="button"
                    onClick={() => {
                      const inv = selectedInvoice;
                      setSelectedInvoice(null);
                      if (onRecordPaymentForInvoice) onRecordPaymentForInvoice(inv);
                    }}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-sm"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Record Payment
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
