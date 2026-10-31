import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Subscription, Customer, Plan, Product, QuotationTemplate } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import {
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  ArrowRight,
  Eye,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface SubscriptionsPageProps {
  onSelectSubscription: (id: string) => void;
}

export const SubscriptionsPage: React.FC<SubscriptionsPageProps> = ({ onSelectSubscription }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Lookups for creation
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);

  // Create form state
  const [formData, setFormData] = useState({
    customerId: '',
    planId: '',
    startDate: new Date().toISOString().slice(0, 10),
    paymentTerms: 'NET30',
    notes: '',
    productId: '',
    quantity: 1,
    unitPrice: 0,
  });

  // Template form state
  const [templateFormData, setTemplateFormData] = useState({
    templateId: '',
    customerId: '',
    paymentTerms: 'NET30',
  });

  const fetchSubscriptions = async () => {
    setLoading(true);
    let url = `/subscriptions?page=${page}&limit=20`;
    if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res = await api.get<Subscription[]>(url);
    if (res.success && res.data) {
      setSubscriptions(res.data);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages);
        setTotalItems(res.pagination.total);
      }
    }
    setLoading(false);
  };

  const loadLookups = async () => {
    const [cRes, pRes, prRes, tRes] = await Promise.all([
      api.get<Customer[]>('/customers?limit=100'),
      api.get<Plan[]>('/plans'),
      api.get<Product[]>('/products'),
      api.get<QuotationTemplate[]>('/templates'),
    ]);

    if (cRes.success && cRes.data) setCustomers(cRes.data);
    if (pRes.success && pRes.data) setPlans(pRes.data);
    if (prRes.success && prRes.data) setProducts(prRes.data);
    if (tRes.success && tRes.data) setTemplates(tRes.data);
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [page, statusFilter]);

  useEffect(() => {
    loadLookups();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSubscriptions();
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/subscriptions', {
      customerId: formData.customerId,
      planId: formData.planId,
      startDate: formData.startDate,
      paymentTerms: formData.paymentTerms,
      notes: formData.notes,
      lines: [
        {
          productId: formData.productId,
          quantity: Number(formData.quantity),
          unitPrice: Number(formData.unitPrice),
          taxRate: 15.0,
        },
      ],
    });

    if (res.success) {
      setIsCreateOpen(false);
      fetchSubscriptions();
    } else {
      alert(`Creation error: ${res.error?.message || 'Failed'}`);
    }
  };

  const handleCreateFromTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/subscriptions/from-template', {
      templateId: templateFormData.templateId,
      customerId: templateFormData.customerId,
      paymentTerms: templateFormData.paymentTerms,
    });

    if (res.success) {
      setIsTemplateModalOpen(false);
      fetchSubscriptions();
    } else {
      alert(`Template creation error: ${res.error?.message || 'Failed'}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Subscriptions &amp; Quotations</h1>
          <p className="text-sm text-slate-500">
            Manage contract lifecycles: Draft → Quotation → Confirmed → Active → Closed
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
            New from Template
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Subscription
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by subscription #, customer name, email..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="QUOTATION">Quotation</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="ACTIVE">Active</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Subscription #</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Plan</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Next Billing</th>
                <th className="py-3 px-5">Payment Terms</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                      Loading subscriptions...
                    </div>
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No subscriptions matching your criteria.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => onSelectSubscription(sub.id)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-5 font-bold text-blue-600 flex items-center gap-1.5">
                      {sub.subscriptionNumber}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900">{sub.customer?.name}</div>
                      <div className="text-[11px] text-slate-400">{sub.customer?.email}</div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-800">{sub.plan?.name}</div>
                      <div className="text-[11px] text-slate-500">
                        ${sub.plan?.price.toFixed(2)} / {sub.plan?.billingPeriod.toLowerCase()}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="py-3.5 px-5 font-mono text-slate-600">
                      {new Date(sub.nextBillingDate).toISOString().slice(0, 10)}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 font-medium">
                      {sub.paymentTerms}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSubscription(sub.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
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

      {/* Modal: New Subscription */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Subscription Proposal"
      >
        <form onSubmit={handleCreateSubscription} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Customer *</label>
            <select
              required
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Select Customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Plan *</label>
            <select
              required
              value={formData.planId}
              onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Select Plan...</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ${p.price}/period ({p.billingPeriod})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
              <select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="IMMEDIATE">Immediate</option>
                <option value="NET15">NET 15</option>
                <option value="NET30">NET 30</option>
                <option value="NET60">NET 60</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="font-bold text-slate-800 mb-2">Primary Line Item</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block font-semibold text-slate-600 mb-1">Product</label>
                <select
                  required
                  value={formData.productId}
                  onChange={(e) => {
                    const sel = products.find((p) => p.id === e.target.value);
                    setFormData({
                      ...formData,
                      productId: e.target.value,
                      unitPrice: sel ? sel.salesPrice : 0,
                    });
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                >
                  <option value="">Select Product...</option>
                  {products.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Qty</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Unit Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes / Internal Reference</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              placeholder="e.g. Approved special pilot agreement"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
            >
              Create Subscription (DRAFT)
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: New from Template */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Generate Quote from Template"
      >
        <form onSubmit={handleCreateFromTemplate} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Quotation Template *</label>
            <select
              required
              value={templateFormData.templateId}
              onChange={(e) => setTemplateFormData({ ...templateFormData, templateId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
            >
              <option value="">Select Template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.lines?.length || 0} line items, {t.validityDays} days validity)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Customer *</label>
            <select
              required
              value={templateFormData.customerId}
              onChange={(e) => setTemplateFormData({ ...templateFormData, customerId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
            >
              <option value="">Select Customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
            <select
              value={templateFormData.paymentTerms}
              onChange={(e) => setTemplateFormData({ ...templateFormData, paymentTerms: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
            >
              <option value="NET30">NET 30</option>
              <option value="NET15">NET 15</option>
              <option value="IMMEDIATE">Immediate</option>
              <option value="NET60">NET 60</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-600 font-semibold text-white hover:bg-purple-700 shadow-md shadow-purple-500/20"
            >
              Generate Quotation (QUOTATION)
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
