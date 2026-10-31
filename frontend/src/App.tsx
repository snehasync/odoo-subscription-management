import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { SubscriptionDetailPage } from './pages/SubscriptionDetailPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { CustomersPage } from './pages/CustomersPage';
import { CatalogPage } from './pages/CatalogPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { CustomerPortalPage } from './pages/CustomerPortalPage';
import { Invoice } from './types';

const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [invoiceForPayment, setInvoiceForPayment] = useState<Invoice | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/30 animate-pulse">
            <span className="text-2xl font-black">⚡</span>
          </div>
          <div className="text-xs font-semibold text-slate-400">Loading Brightloop Engine...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Customer role view
  if (user.role === 'CUSTOMER') {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar currentTab="portal" onSelectTab={() => {}} />
          <main className="flex-1 p-8 overflow-y-auto">
            <CustomerPortalPage />
          </main>
        </div>
      </div>
    );
  }

  // Admin & Staff view
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage />;

      case 'subscriptions':
        if (selectedSubId) {
          return (
            <SubscriptionDetailPage
              subscriptionId={selectedSubId}
              onBack={() => setSelectedSubId(null)}
              onSelectInvoice={(invId) => {
                setCurrentTab('invoices');
              }}
            />
          );
        }
        return (
          <SubscriptionsPage
            onSelectSubscription={(id) => setSelectedSubId(id)}
          />
        );

      case 'invoices':
        return (
          <InvoicesPage
            onRecordPaymentForInvoice={(inv) => {
              setInvoiceForPayment(inv);
              setCurrentTab('payments');
            }}
          />
        );

      case 'payments':
        return (
          <PaymentsPage
            initialInvoiceForPayment={invoiceForPayment}
            onClearInitialInvoice={() => setInvoiceForPayment(null)}
          />
        );

      case 'customers':
        return <CustomersPage />;

      case 'catalog':
        return user.role === 'ADMIN' ? <CatalogPage /> : <DashboardPage />;

      case 'audit-logs':
        return user.role === 'ADMIN' ? <AuditLogsPage /> : <DashboardPage />;

      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setSelectedSubId(null);
          }}
        />
        <main className="flex-1 p-8 overflow-y-auto">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
