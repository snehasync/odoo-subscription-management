import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Customer } from '../types';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { Search, Plus, Building, Mail, Phone, MapPin, Repeat, Receipt } from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    address: '',
    phone: '',
    notes: '',
  });

  const fetchCustomers = async () => {
    setLoading(true);
    let url = `/customers?page=${page}&limit=20`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res = await api.get<Customer[]>(url);
    if (res.success && res.data) {
      setCustomers(res.data);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages);
        setTotalItems(res.pagination.total);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/customers', formData);
    if (res.success) {
      setIsModalOpen(false);
      setFormData({ name: '', email: '', company: '', address: '', phone: '', notes: '' });
      fetchCustomers();
    } else {
      alert(`Customer error: ${res.error?.message || 'Failed'}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Customer Directory</h1>
          <p className="text-sm text-slate-500">
            Enterprise client accounts and linked self-service customer portal profiles.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Customer
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers by company, name, email..."
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
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Customer Name &amp; Company</th>
                <th className="py-3 px-5">Contact Details</th>
                <th className="py-3 px-5">Address</th>
                <th className="py-3 px-5 text-center">Subscriptions</th>
                <th className="py-3 px-5 text-center">Invoices</th>
                <th className="py-3 px-5 text-slate-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                      Loading customers...
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      {c.company && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400" />
                          {c.company}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="text-slate-800 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {c.email}
                      </div>
                      {c.phone && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {c.phone}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">
                      {c.address ? (
                        <div className="flex items-start gap-1 max-w-xs truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                          <span>{c.address}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-center font-bold text-blue-600">
                      {c._count?.subscriptions ?? 0}
                    </td>
                    <td className="py-3.5 px-5 text-center font-bold text-slate-700">
                      {c._count?.invoices ?? 0}
                    </td>
                    <td className="py-3.5 px-5 text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString()}
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

      {/* Add Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Customer"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer / Contact Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Acme Corp Billing"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="billing@example.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="e.g. Acme Corp Ltd"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1-555-0100"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Billing Street Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="100 Silicon Way, Tech City, CA"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Customer requirements, tier agreements..."
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
              className="px-5 py-2 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
            >
              Save Customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
