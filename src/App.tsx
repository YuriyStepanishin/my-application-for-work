import { lazy, Suspense, useState } from 'react';

const HomePage = lazy(() => import('./components/HomePage/HomePage'));
const StoreSelector = lazy(
  () => import('./components/StoreSelector/StoreSelector')
);
const ReportDetailsForm = lazy(
  () => import('./components/ReportDetailsForm/ReportDetailsForm')
);
const ReportBonusForm = lazy(
  () => import('./components/ReportBonusForm/ReportBonusForm')
);
const PhotoGallery = lazy(
  () => import('./components/PhotoGallery/PhotoGallery')
);
const SalesPage = lazy(() => import('./components/SalesPage/SalesPage'));

import type { SheetRow } from './types/sheet';

import InstallButton from './components/InstallButton/InstallButton';
import Loader from './components/Loader/Loader';
import UserMenu from './components/UserMenu/UserMenu';

import { useDisplaySheet, useBonusSheet } from './api/queries';

export default function App() {
  const [page, setPage] = useState<'home' | 'sales'>('home');
  const [email, setEmail] = useState<string | null>(() =>
    localStorage.getItem('auth')
  );
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(() => !email);
  const [showStoreSelector, setShowStoreSelector] = useState(false);

  const [reportType, setReportType] = useState<'display' | 'bonus' | null>(
    null
  );
  const [showGallery, setShowGallery] = useState(false);
  const shouldLoadDisplaySheet = showStoreSelector && reportType === 'display';
  const shouldLoadBonusSheet = showStoreSelector && reportType === 'bonus';
  const displayQuery = useDisplaySheet(shouldLoadDisplaySheet);
  const bonusQuery = useBonusSheet(shouldLoadBonusSheet);

  const [selectedStore, setSelectedStore] = useState<{
    department: string;
    representative: string;
    store: string;
  } | null>(null);

  function resetToHome() {
    setPage('home');
    setShowStoreSelector(false);
    setReportType(null);
    setShowGallery(false);
    setSelectedStore(null);
  }

  function handleLogin(nextEmail: string) {
    localStorage.setItem('auth', nextEmail);
    setEmail(nextEmail);
    setIsUserMenuOpen(false);
  }

  function handleLogout() {
    localStorage.removeItem('auth');
    setEmail(null);
    resetToHome();
    setIsUserMenuOpen(true);
  }

  function runProtectedAction(action: () => void) {
    if (!email) {
      setIsUserMenuOpen(true);
      return;
    }

    action();
  }

  if (showGallery) {
    return (
      <>
        <Suspense fallback={<Loader />}>
          <PhotoGallery onBack={() => setShowGallery(false)} />
        </Suspense>
        <UserMenu
          email={email}
          isOpen={isUserMenuOpen}
          onOpen={() => setIsUserMenuOpen(true)}
          onClose={() => setIsUserMenuOpen(false)}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      </>
    );
  }
  if (page === 'sales') {
    return (
      <>
        <Suspense fallback={<Loader />}>
          <SalesPage onBack={() => setPage('home')} />
        </Suspense>
        <UserMenu
          email={email}
          isOpen={isUserMenuOpen}
          onOpen={() => setIsUserMenuOpen(true)}
          onClose={() => setIsUserMenuOpen(false)}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      </>
    );
  }
  // HOME PAGE
  if (!showStoreSelector) {
    return (
      <>
        <Suspense fallback={<Loader />}>
          <HomePage
            onOpenDisplay={() =>
              runProtectedAction(() => {
                setReportType('display');
                setShowStoreSelector(true);
              })
            }
            onOpenBonus={() =>
              runProtectedAction(() => {
                setReportType('bonus');
                setShowStoreSelector(true);
              })
            }
            onOpenGallery={() => runProtectedAction(() => setShowGallery(true))}
            onOpenSales={() => runProtectedAction(() => setPage('sales'))}
          />
        </Suspense>
        <UserMenu
          email={email}
          isOpen={isUserMenuOpen}
          onOpen={() => setIsUserMenuOpen(true)}
          onClose={() => setIsUserMenuOpen(false)}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
        <InstallButton />
      </>
    );
  }

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
        <Suspense fallback={<Loader />}>
          <StoreSelector
            data={sheetData}
            onSelect={store => setSelectedStore(store)}
            onBack={() => {
              setShowStoreSelector(false);
              setReportType(null);
            }}
          />
        </Suspense>
        <UserMenu
          email={email}
          isOpen={isUserMenuOpen}
          onOpen={() => setIsUserMenuOpen(true)}
          onClose={() => setIsUserMenuOpen(false)}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
        <InstallButton />
      </>
    );
  }

  // REPORT FORMS
  return (
    <>
      <Suspense fallback={<Loader />}>
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
      </Suspense>
      <UserMenu
        email={email}
        isOpen={isUserMenuOpen}
        onOpen={() => setIsUserMenuOpen(true)}
        onClose={() => setIsUserMenuOpen(false)}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
      <InstallButton />
    </>
  );
}
