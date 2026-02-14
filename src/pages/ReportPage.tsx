import { useEffect, useState } from 'react';
import styles from './ReportPage.module.css';

import { fetchSheetData } from '../api/sheetApi';

import StoreSelector from '../components/StoreSelector/StoreSelector';
import ReportDetailsForm from '../components/ReportDetailsForm/ReportDetailsForm';

import type { SheetRow } from '../types/sheet';

export default function ReportPage() {
  const [data, setData] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [storeData, setStoreData] = useState<{
    department: string;
    representative: string;
    store: string;
  } | null>(null);

  useEffect(() => {
    fetchSheetData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  // loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white px-6 py-4 rounded-xl shadow-md">
          Завантаження...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {!storeData ? (
          <StoreSelector data={data} onSelect={store => setStoreData(store)} />
        ) : (
          <ReportDetailsForm
            storeData={storeData}
            onBack={() => setStoreData(null)}
          />
        )}
      </div>
    </div>
  );
}
