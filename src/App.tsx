import { useState } from 'react';

import LoginPage from './components/LoginPage/LoginPage';
import ReportPage from './components/ReportPage/ReportPage';
import HomePage from './components/HomePage/HomePage';

import StoreSelector from './components/StoreSelector/StoreSelector';
import ReportDetailsForm from './components/ReportDetailsForm/ReportDetailsForm';
import ReportBonusForm from './components/ReportBonusForm/ReportBonusForm';

import { fetchSheetData, fetchBonusSheetData } from './api/sheetApi';

import type { SheetRow } from './types/sheet';
import InstallButton from './components/InstallButton/InstallButton';

export default function App() {
  const [email, setEmail] = useState<string | null>(
    localStorage.getItem('auth')
  );

  const [showHome, setShowHome] = useState(false);
  const [showStoreSelector, setShowStoreSelector] = useState(false);

  const [sheetData, setSheetData] = useState<SheetRow[]>([]);
  const [reportType, setReportType] = useState<'display' | 'bonus' | null>(
    null
  );

  const [selectedStore, setSelectedStore] = useState<{
    department: string;
    representative: string;
    store: string;
  } | null>(null);

  // LOGIN
  if (!email) {
    return (
      <>
        <LoginPage
          onSuccess={email => {
            localStorage.setItem('auth', email);
            setEmail(email);
          }}
        />
        <InstallButton />
      </>
    );
  }

  // REPORT PAGE
  if (!showHome) {
    return (
      <>
        <ReportPage
          email={email}
          onOk={() => setShowHome(true)}
          onLogout={() => {
            localStorage.removeItem('auth');
            setEmail(null);
          }}
        />
        <InstallButton />
      </>
    );
  }

  // HOME PAGE
  if (!showStoreSelector) {
    return (
      <>
        <HomePage
          onOpenDisplay={() => {
            fetchSheetData().then(data => {
              setSheetData(data);
              setReportType('display'); // ← важливо
              setShowStoreSelector(true);
            });
          }}
          onOpenBonus={() => {
            fetchBonusSheetData().then(data => {
              setSheetData(data);
              setReportType('bonus'); // ← важливо
              setShowStoreSelector(true);
            });
          }}
        />
        <InstallButton />
      </>
    );
  }

  // STORE SELECTOR
  if (!selectedStore) {
    return (
      <>
        <StoreSelector
          data={sheetData}
          onSelect={store => setSelectedStore(store)}
          onBack={() => setShowStoreSelector(false)}
        />
        <InstallButton />
      </>
    );
  }

  // REPORT DETAILS
  return (
    <>
      {reportType === 'display' ? (
        <ReportDetailsForm
          storeData={selectedStore}
          onBack={() => setSelectedStore(null)}
        />
      ) : (
        <ReportBonusForm
          storeData={selectedStore}
          onBack={() => setSelectedStore(null)}
        />
      )}
      <InstallButton />
    </>
  );
}
