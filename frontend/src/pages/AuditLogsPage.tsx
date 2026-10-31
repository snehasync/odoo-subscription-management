import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { AuditLog } from '../types';
import { Pagination } from '../components/Pagination';
import { Shield, Clock, Search, FileText } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    const res = await api.get<AuditLog[]>(`/reports/audit-logs?page=${page}&limit=25`);
    if (res.success && res.data) {
      setLogs(res.data);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages);
        setTotalItems(res.pagination.total);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Security &amp; Mutation Audit Trail</h1>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              Admin Exclusive
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Immutable log of user authentication, subscription transitions, payments, and system configuration edits.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
            <tr>
              <th className="py-3 px-5">Timestamp</th>
              <th className="py-3 px-5">User</th>
              <th className="py-3 px-5">Action</th>
              <th className="py-3 px-5">Entity</th>
              <th className="py-3 px-5">Details / Payload</th>
              <th className="py-3 px-5 text-right">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    Loading audit trail...
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No audit logs recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-5 font-mono text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-5">
                    {log.user ? (
                      <div>
                        <span className="font-semibold text-slate-900">{log.user.fullName}</span>
                        <span className="block text-[10px] text-slate-400">{log.user.email}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">System / Anonymous</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 font-mono font-bold text-blue-700 text-[11px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 font-medium text-slate-700">
                    {log.entity} {log.entityId && <span className="font-mono text-[10px] text-slate-400">({log.entityId.slice(0, 8)}...)</span>}
                  </td>
                  <td className="py-3.5 px-5 max-w-xs truncate font-mono text-slate-500 text-[11px]">
                    {log.payloadJson || '-'}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono text-slate-400">
                    {log.ipAddress || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={25}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};
