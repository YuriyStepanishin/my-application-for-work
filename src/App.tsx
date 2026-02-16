import { useState } from 'react';

import LoginPage from './pages/LoginPage/LoginPage';
import ReportPage from './pages/ReportPage/ReportPage';
import HomePage from './pages/HomePage/HomePage';

import StoreSelector from './components/StoreSelector/StoreSelector';
import ReportDetailsForm from './components/ReportDetailsForm/ReportDetailsForm';

import { fetchSheetData } from './api/sheetApi';

import type { SheetRow } from './types/sheet';
import InstallButton from './components/InstallButton/InstallButton';

export default function App() {
  const [email, setEmail] = useState<string | null>(
    localStorage.getItem('auth')
  );

  const [showHome, setShowHome] = useState(false);
  const [showStoreSelector, setShowStoreSelector] = useState(false);

  const [sheetData, setSheetData] = useState<SheetRow[]>(
    JSON.parse(localStorage.getItem('sheetData') || '[]')
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
          onOpenReport={() => {
            setShowStoreSelector(true); // миттєвий перехід

            fetchSheetData().then(data => {
              setSheetData(data);
              localStorage.setItem('sheetData', JSON.stringify(data));
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
      <ReportDetailsForm
        storeData={selectedStore}
        onBack={() => setSelectedStore(null)}
      />
      <InstallButton />
    </>
  );
}
