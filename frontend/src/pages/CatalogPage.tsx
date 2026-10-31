import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Product, Plan, TaxRule, Discount, QuotationTemplate } from '../types';
import { Modal } from '../components/Modal';
import {
  Package,
  Layers,
  Percent,
  Tag,
  FileSpreadsheet,
  Plus,
  Shield,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const CatalogPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'products' | 'plans' | 'taxes' | 'discounts' | 'templates'>('products');
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);

  // Modals
  const [modalType, setModalType] = useState<string | null>(null);

  // Forms
  const [productForm, setProductForm] = useState({
    name: '',
    type: 'SERVICE',
    salesPrice: 0,
    costPrice: 0,
    notes: '',
    variantName: '',
    variantAdjustment: 0,
  });

  const [planForm, setPlanForm] = useState({
    name: '',
    code: '',
    price: 0,
    billingPeriod: 'MONTHLY',
    minQuantity: 1,
    autoCloseAtEndDate: false,
    allowEarlyClose: true,
    allowPause: true,
    allowRenewal: true,
  });

  const [taxForm, setTaxForm] = useState({
    name: '',
    ratePercent: 15,
    appliesToType: 'ALL',
  });

  const [discountForm, setDiscountForm] = useState({
    code: '',
    type: 'PERCENTAGE',
    value: 10,
    minPurchase: 0,
    minQuantity: 0,
    maxUsageCount: 100,
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    validityDays: 30,
    notes: '',
    productId: '',
    quantity: 1,
    unitPrice: 0,
  });

  const fetchAll = async () => {
    setLoading(true);
    const [pRes, plRes, txRes, dRes, tRes] = await Promise.all([
      api.get<Product[]>('/products'),
      api.get<Plan[]>('/plans'),
      api.get<TaxRule[]>('/taxes'),
      api.get<Discount[]>('/discounts'),
      api.get<QuotationTemplate[]>('/templates'),
    ]);

    if (pRes.success && pRes.data) setProducts(pRes.data);
    if (plRes.success && plRes.data) setPlans(plRes.data);
    if (txRes.success && txRes.data) setTaxes(txRes.data);
    if (dRes.success && dRes.data) setDiscounts(dRes.data);
    if (tRes.success && tRes.data) setTemplates(tRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Creation Handlers
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: productForm.name,
      type: productForm.type,
      salesPrice: Number(productForm.salesPrice),
      costPrice: Number(productForm.costPrice),
      notes: productForm.notes,
    };
    if (productForm.variantName) {
      payload.variants = [
        {
          name: productForm.variantName,
          priceAdjustment: Number(productForm.variantAdjustment),
        },
      ];
    }
    const res = await api.post('/products', payload);
    if (res.success) {
      setModalType(null);
      fetchAll();
    } else {
      alert(`Error: ${res.error?.message}`);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/plans', {
      ...planForm,
      price: Number(planForm.price),
      minQuantity: Number(planForm.minQuantity),
    });
    if (res.success) {
      setModalType(null);
      fetchAll();
    } else {
      alert(`Error: ${res.error?.message}`);
    }
  };

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/taxes', {
      ...taxForm,
      ratePercent: Number(taxForm.ratePercent),
    });
    if (res.success) {
      setModalType(null);
      fetchAll();
    } else {
      alert(`Error: ${res.error?.message}`);
    }
  };

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/discounts', {
      ...discountForm,
      value: Number(discountForm.value),
      minPurchase: Number(discountForm.minPurchase),
      minQuantity: Number(discountForm.minQuantity),
      maxUsageCount: Number(discountForm.maxUsageCount),
    });
    if (res.success) {
      setModalType(null);
      fetchAll();
    } else {
      alert(`Error: ${res.error?.message}`);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/templates', {
      name: templateForm.name,
      validityDays: Number(templateForm.validityDays),
      notes: templateForm.notes,
      lines: [
        {
          productId: templateForm.productId,
          quantity: Number(templateForm.quantity),
          unitPrice: Number(templateForm.unitPrice),
        },
      ],
    });
    if (res.success) {
      setModalType(null);
      fetchAll();
    } else {
      alert(`Error: ${res.error?.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Products &amp; Pricing Configuration</h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              <Shield className="w-3 h-3" />
              Admin Only
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Define products with variants, subscription plans, automated tax rules, promotional discounts, and quote templates.
          </p>
        </div>

        <button
          onClick={() => setModalType(subTab)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add New {subTab.slice(0, -1)}
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold text-slate-500">
        <button
          onClick={() => setSubTab('products')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            subTab === 'products'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          Products &amp; Variants ({products.length})
        </button>
        <button
          onClick={() => setSubTab('plans')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            subTab === 'plans'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          Plans ({plans.length})
        </button>
        <button
          onClick={() => setSubTab('taxes')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            subTab === 'taxes'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Percent className="w-4 h-4" />
          Tax Rules ({taxes.length})
        </button>
        <button
          onClick={() => setSubTab('discounts')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            subTab === 'discounts'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Tag className="w-4 h-4" />
          Discounts ({discounts.length})
        </button>
        <button
          onClick={() => setSubTab('templates')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            subTab === 'templates'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Quotation Templates ({templates.length})
        </button>
      </div>

      {/* Content for Products */}
      {subTab === 'products' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Product Name</th>
                <th className="py-3 px-5">Type</th>
                <th className="py-3 px-5 text-right">Sales Price</th>
                <th className="py-3 px-5 text-right">Cost Price</th>
                <th className="py-3 px-5">Configured Variants</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-5 font-bold text-slate-900">
                    {p.name}
                    {p.notes && <div className="text-[11px] text-slate-400 font-normal">{p.notes}</div>}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {p.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900 text-sm">
                    ${p.salesPrice.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono text-slate-500">
                    ${p.costPrice.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-5">
                    {p.variants && p.variants.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {p.variants.map((v) => (
                          <span
                            key={v.id}
                            className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 font-medium"
                          >
                            {v.name} ({v.priceAdjustment >= 0 ? `+$${v.priceAdjustment}` : `-$${Math.abs(v.priceAdjustment)}`})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Content for Plans */}
      {subTab === 'plans' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Plan Code &amp; Name</th>
                <th className="py-3 px-5">Billing Period</th>
                <th className="py-3 px-5 text-right">Price</th>
                <th className="py-3 px-5 text-center">Min Qty</th>
                <th className="py-3 px-5">Admin Lifecycle Flags</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((pl) => (
                <tr key={pl.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-5">
                    <div className="font-bold text-slate-900">{pl.name}</div>
                    <div className="font-mono text-[10px] text-blue-600 font-bold">{pl.code}</div>
                  </td>
                  <td className="py-3.5 px-5 font-semibold text-slate-700">
                    {pl.billingPeriod}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900 text-sm">
                    ${pl.price.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-5 text-center font-medium">{pl.minQuantity}</td>
                  <td className="py-3.5 px-5">
                    <div className="flex flex-wrap gap-1">
                      {pl.autoCloseAtEndDate && (
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                          Auto-Close at End
                        </span>
                      )}
                      {pl.allowEarlyClose && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                          Early Close
                        </span>
                      )}
                      {pl.allowRenewal ? (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">
                          Renewal Allowed
                        </span>
                      ) : (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">
                          No Renewal
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <span className="text-emerald-600 font-bold">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Content for Taxes */}
      {subTab === 'taxes' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Tax Rule Name</th>
                <th className="py-3 px-5 text-right">Rate %</th>
                <th className="py-3 px-5">Applies To Product Type</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taxes.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-5 font-bold text-slate-900">{tx.name}</td>
                  <td className="py-3.5 px-5 text-right font-mono font-bold text-blue-600 text-sm">
                    {tx.ratePercent.toFixed(2)}%
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {tx.appliesToType}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <span className="text-emerald-600 font-bold">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Content for Discounts */}
      {subTab === 'discounts' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Promo Code</th>
                <th className="py-3 px-5">Type &amp; Value</th>
                <th className="py-3 px-5">Min Purchase / Qty</th>
                <th className="py-3 px-5 text-center">Usage Count</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {discounts.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-5 font-mono font-bold text-blue-600 text-sm">{d.code}</td>
                  <td className="py-3.5 px-5">
                    <span className="font-bold text-slate-800">
                      {d.type === 'PERCENTAGE' ? `${d.value}% Off` : `$${d.value.toFixed(2)} Flat Off`}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-600">
                    Min ${d.minPurchase.toFixed(2)} {d.minQuantity > 0 && `(Min ${d.minQuantity} items)`}
                  </td>
                  <td className="py-3.5 px-5 text-center">
                    <span className="font-semibold text-slate-800">{d.usageCount}</span>
                    <span className="text-slate-400"> / {d.maxUsageCount === 0 ? '∞' : d.maxUsageCount}</span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <span className={`font-bold ${d.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {d.active ? 'Active' : 'Expired'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Content for Quotation Templates */}
      {subTab === 'templates' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Template Name</th>
                <th className="py-3 px-5 text-center">Validity (Days)</th>
                <th className="py-3 px-5">Preset Lines</th>
                <th className="py-3 px-5 text-slate-400">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-5 font-bold text-slate-900">{t.name}</td>
                  <td className="py-3.5 px-5 text-center font-bold text-blue-600">{t.validityDays} days</td>
                  <td className="py-3.5 px-5">
                    <div className="flex flex-wrap gap-1">
                      {t.lines.map((l) => (
                        <span key={l.id} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                          {l.product?.name || 'Line'} ({l.quantity}x @ ${l.unitPrice})
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-slate-500">{t.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals for Adding Entities */}
      {/* Product Modal */}
      <Modal isOpen={modalType === 'products'} onClose={() => setModalType(null)} title="Create Product">
        <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product Type *</label>
              <select
                value={productForm.type}
                onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              >
                <option value="SERVICE">Service</option>
                <option value="PHYSICAL">Physical Product</option>
                <option value="DIGITAL">Digital License / Software</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sales Price ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={productForm.salesPrice}
                onChange={(e) => setProductForm({ ...productForm, salesPrice: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cost Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={productForm.costPrice}
                onChange={(e) => setProductForm({ ...productForm, costPrice: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="font-bold text-slate-800 mb-2">Initial Variant (Optional e.g. Odoo brand = +560)</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Variant Name</label>
                <input
                  type="text"
                  placeholder="e.g. Brand: Odoo"
                  value={productForm.variantName}
                  onChange={(e) => setProductForm({ ...productForm, variantName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Price Adjustment ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="560"
                  value={productForm.variantAdjustment}
                  onChange={(e) => setProductForm({ ...productForm, variantAdjustment: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
            >
              Save Product
            </button>
          </div>
        </form>
      </Modal>

      {/* Plan Modal */}
      <Modal isOpen={modalType === 'plans'} onClose={() => setModalType(null)} title="Create Subscription Plan">
        <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Plan Name *</label>
              <input
                type="text"
                required
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unique Plan Code *</label>
              <input
                type="text"
                required
                value={planForm.code}
                onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. ENTERPRISE-M"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 uppercase font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Price ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={planForm.price}
                onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Billing Period *</label>
              <select
                value={planForm.billingPeriod}
                onChange={(e) => setPlanForm({ ...planForm, billingPeriod: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Min Quantity</label>
              <input
                type="number"
                min="1"
                value={planForm.minQuantity}
                onChange={(e) => setPlanForm({ ...planForm, minQuantity: parseInt(e.target.value, 10) || 1 })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="font-bold text-slate-800">Admin Lifecycle Flags</div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={planForm.autoCloseAtEndDate}
                onChange={(e) => setPlanForm({ ...planForm, autoCloseAtEndDate: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Auto-close subscription at end date</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={planForm.allowEarlyClose}
                onChange={(e) => setPlanForm({ ...planForm, allowEarlyClose: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Allow early close before expiry</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={planForm.allowPause}
                onChange={(e) => setPlanForm({ ...planForm, allowPause: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Allow subscription pause</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={planForm.allowRenewal}
                onChange={(e) => setPlanForm({ ...planForm, allowRenewal: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Allow renewal from closed state</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
            >
              Save Plan
            </button>
          </div>
        </form>
      </Modal>

      {/* Tax Modal */}
      <Modal isOpen={modalType === 'taxes'} onClose={() => setModalType(null)} title="Create Tax Rule">
        <form onSubmit={handleCreateTax} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Rule Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Standard VAT"
              value={taxForm.name}
              onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rate Percent (%) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={taxForm.ratePercent}
                onChange={(e) => setTaxForm({ ...taxForm, ratePercent: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Applies To Type *</label>
              <select
                value={taxForm.appliesToType}
                onChange={(e) => setTaxForm({ ...taxForm, appliesToType: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              >
                <option value="ALL">All Types</option>
                <option value="SERVICE">Service Only</option>
                <option value="PHYSICAL">Physical Only</option>
                <option value="DIGITAL">Digital Only</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
            >
              Save Tax Rule
            </button>
          </div>
        </form>
      </Modal>

      {/* Discount Modal */}
      <Modal isOpen={modalType === 'discounts'} onClose={() => setModalType(null)} title="Create Discount Rule">
        <form onSubmit={handleCreateDiscount} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Promo Code *</label>
              <input
                type="text"
                required
                placeholder="PROMO20"
                value={discountForm.code}
                onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 uppercase font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Discount Type *</label>
              <select
                value={discountForm.type}
                onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount ($)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Value *</label>
              <input
                type="number"
                step="0.01"
                required
                value={discountForm.value}
                onChange={(e) => setDiscountForm({ ...discountForm, value: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Min Purchase ($)</label>
              <input
                type="number"
                step="0.01"
                value={discountForm.minPurchase}
                onChange={(e) => setDiscountForm({ ...discountForm, minPurchase: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Max Usages</label>
              <input
                type="number"
                min="0"
                value={discountForm.maxUsageCount}
                onChange={(e) => setDiscountForm({ ...discountForm, maxUsageCount: parseInt(e.target.value, 10) || 0 })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
            >
              Save Discount
            </button>
          </div>
        </form>
      </Modal>

      {/* Template Modal */}
      <Modal isOpen={modalType === 'templates'} onClose={() => setModalType(null)} title="Create Quotation Template">
        <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Template Name *</label>
              <input
                type="text"
                required
                placeholder="Enterprise Migration Bundle"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Validity (Days) *</label>
              <input
                type="number"
                min="1"
                required
                value={templateForm.validityDays}
                onChange={(e) => setTemplateForm({ ...templateForm, validityDays: parseInt(e.target.value, 10) || 30 })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="font-bold text-slate-800 mb-2">Preset Product Line</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block font-semibold text-slate-600 mb-1">Product</label>
                <select
                  required
                  value={templateForm.productId}
                  onChange={(e) => {
                    const sel = products.find((p) => p.id === e.target.value);
                    setTemplateForm({
                      ...templateForm,
                      productId: e.target.value,
                      unitPrice: sel ? sel.salesPrice : 0,
                    });
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                >
                  <option value="">Select Product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
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
                  value={templateForm.quantity}
                  onChange={(e) => setTemplateForm({ ...templateForm, quantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Unit Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={templateForm.unitPrice}
                  onChange={(e) => setTemplateForm({ ...templateForm, unitPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              value={templateForm.notes}
              onChange={(e) => setTemplateForm({ ...templateForm, notes: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
            >
              Save Template
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
