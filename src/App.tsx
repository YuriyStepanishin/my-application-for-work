import { useState } from 'react';

import LoginPage from './components/LoginPage/LoginPage';
import LoginAppPage from './components/LoginAppPage/LoginAppPage';
import HomePage from './components/HomePage/HomePage';

import StoreSelector from './components/StoreSelector/StoreSelector';
import ReportDetailsForm from './components/ReportDetailsForm/ReportDetailsForm';
import ReportBonusForm from './components/ReportBonusForm/ReportBonusForm';
import PhotoGallery from './components/PhotoGallery/PhotoGallery';

import type { SheetRow } from './types/sheet';

import InstallButton from './components/InstallButton/InstallButton';
import Loader from './components/Loader/Loader';

import { useDisplaySheet, useBonusSheet } from './api/queries';

export default function App() {
  const displayQuery = useDisplaySheet();
  const bonusQuery = useBonusSheet();

  const [email, setEmail] = useState<string | null>(() =>
    localStorage.getItem('auth')
  );

  const [showHome, setShowHome] = useState(false);
  const [showStoreSelector, setShowStoreSelector] = useState(false);

  const [reportType, setReportType] = useState<'display' | 'bonus' | null>(
    null
  );
  const [showGallery, setShowGallery] = useState(false);

  const [selectedStore, setSelectedStore] = useState<{
    department: string;
    representative: string;
    store: string;
  } | null>(null);

  // LOGIN PAGE
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
        <LoginAppPage
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
  if (showGallery) {
    return <PhotoGallery onBack={() => setShowGallery(false)} />;
  }

  // HOME PAGE
  if (!showStoreSelector) {
    return (
      <>
        <HomePage
          onOpenDisplay={() => {
            setReportType('display');
            setShowStoreSelector(true);
          }}
          onOpenBonus={() => {
            setReportType('bonus');
            setShowStoreSelector(true);
          }}
          onOpenGallery={() => setShowGallery(true)}
        />
        <InstallButton />
      </>
    );
  }

  // LOADING DATA
  if (
    (reportType === 'display' && displayQuery.isLoading) ||
    (reportType === 'bonus' && bonusQuery.isLoading)
  ) {
    return <Loader />;
  }

  const sheetData: SheetRow[] =
    reportType === 'display'
      ? (displayQuery.data ?? [])
      : (bonusQuery.data ?? []);

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

  // REPORT FORMS
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
