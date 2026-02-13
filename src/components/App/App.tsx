import { useEffect, useState } from 'react';

import { fetchSheetData } from '../../api/sheetApi';

import StoreSelector from '../StoreSelector/StoreSelector';
import ReportDetailsForm from '../ReportDetailsForm/ReportDetailsForm';
import ThemeToggle from '../ThemeToggle/ThemeToggle';

import type { SheetRow } from '../../types/sheet';

export default function App() {
  const [data, setData] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [storeData, setStoreData] = useState<null | {
    department: string;
    representative: string;
    store: string;
  }>(null);

  useEffect(() => {
    fetchSheetData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="
        min-h-screen
        bg-white dark:bg-gray-900
        text-black dark:text-white
        transition
      "
    >
      {/* кнопка теми */}
      <div className="p-4 flex justify-end">
        <ThemeToggle />
      </div>

      {/* контент */}
      <div className="p-4">
        {loading && <div>Loading...</div>}

        {!loading && !storeData && (
          <StoreSelector data={data} onSelect={store => setStoreData(store)} />
        )}

        {!loading && storeData && (
          <ReportDetailsForm
            storeData={storeData}
            onBack={() => setStoreData(null)}
          />
        )}
      </div>
    </div>
  );
}
