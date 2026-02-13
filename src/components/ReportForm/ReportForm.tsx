import { useEffect, useState } from 'react';
import { fetchSheetData } from '../../api/sheetApi';
import type { SheetRow } from '../../types/sheet';

import StoreSelector from '../StoreSelector/StoreSelector';
import ReportDetailsForm from '../ReportDetailsForm/ReportDetailsForm';

export default function ReportForm() {
  const [data, setData] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedStore, setSelectedStore] = useState<{
    department: string;
    representative: string;
    store: string;
  } | null>(null);

  useEffect(() => {
    fetchSheetData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Завантаження...</div>;

  if (!selectedStore)
    return <StoreSelector data={data} onSelect={setSelectedStore} />;

  return (
    <ReportDetailsForm
      storeData={selectedStore}
      onBack={() => setSelectedStore(null)}
    />
  );
}
