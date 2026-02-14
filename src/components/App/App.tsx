import { useEffect, useState } from 'react';

import { fetchSheetData } from '../../api/sheetApi';

import StoreSelector from '../StoreSelector/StoreSelector';
import ReportDetailsForm from '../ReportDetailsForm/ReportDetailsForm';

import type { SheetRow } from '../../types/sheet';

export default function App() {
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

  if (loading) {
    return <div className="p-6">Завантаження...</div>;
  }

  return (
    <div className="min-h-screen flex justify-center items-start p-6">
      <div
        className="
          w-full
          max-w-2xl
          bg-white
          rounded-2xl
          shadow-xl
          p-6
        "
      >
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
