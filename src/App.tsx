import { useState } from 'react';

import LoginPage from './pages/LoginPage';
import ReportPage from './pages/ReportPage';
import HomePage from './pages/HomePage/HomePage';

import StoreSelector from './components/StoreSelector/StoreSelector';
import ReportDetailsForm from './components/ReportDetailsForm/ReportDetailsForm';

import { fetchSheetData } from './api/sheetApi';

import type { SheetRow } from './types/sheet';

export default function App() {
  // авторизація
  const [email, setEmail] = useState<string | null>(
    localStorage.getItem('auth')
  );

  // екрани
  const [showHome, setShowHome] = useState(false);
  const [showStoreSelector, setShowStoreSelector] = useState(false);

  // дані таблиці
  const [sheetData, setSheetData] = useState<SheetRow[]>([]);

  // вибрана ТТ
  const [selectedStore, setSelectedStore] = useState<{
    department: string;
    representative: string;
    store: string;
  } | null>(null);

  // ============================
  // LOGIN
  // ============================

  if (!email) {
    return (
      <LoginPage
        onSuccess={email => {
          localStorage.setItem('auth', email);
          setEmail(email);
        }}
      />
    );
  }

  // ============================
  // REPORT PAGE (привітання)
  // ============================

  if (!showHome) {
    return (
      <ReportPage
        email={email}
        onOk={() => setShowHome(true)}
        onLogout={() => {
          localStorage.removeItem('auth');
          setEmail(null);
        }}
      />
    );
  }

  // ============================
  // HOME PAGE
  // ============================

  if (showHome && !showStoreSelector) {
    return (
      <HomePage
        onOpenReport={async () => {
          const data = await fetchSheetData();

          setSheetData(data);

          setShowStoreSelector(true);
        }}
      />
    );
  }

  // ============================
  // STORE SELECTOR
  // ============================

  if (!selectedStore) {
    return (
      <StoreSelector
        data={sheetData}
        onSelect={store => setSelectedStore(store)}
      />
    );
  }

  // ============================
  // REPORT DETAILS FORM
  // ============================

  return (
    <ReportDetailsForm
      storeData={selectedStore}
      onBack={() => setSelectedStore(null)}
    />
  );
}
