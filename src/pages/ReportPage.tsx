import { useEffect, useState } from 'react';

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
    <div className="min-h-screen bg-gray-50 flex justify-center">
      {/* mobile container */}
      <div className="w-full max-w-md min-h-screen flex flex-col">
        {/* header */}
        <div className="sticky top-0 z-10 bg-white shadow-sm">
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="text-lg font-semibold text-gray-800">Фото звіт</div>

            {storeData && (
              <button
                onClick={() => setStoreData(null)}
                className="
                  text-sm
                  text-amber-600
                  font-medium
                  active:scale-95
                "
              >
                Назад
              </button>
            )}
          </div>
        </div>

        {/* content */}
        <div className="flex-1 p-4">
          <div
            className="
              bg-white
              rounded-2xl
              shadow-md
              p-5
              space-y-4
            "
          >
            {!storeData ? (
              <StoreSelector
                data={data}
                onSelect={store => setStoreData(store)}
              />
            ) : (
              <ReportDetailsForm
                storeData={storeData}
                onBack={() => setStoreData(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
