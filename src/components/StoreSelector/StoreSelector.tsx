import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  fetchStoreSelectorData,
  type StoreSelectorSource,
  type StoreSelectorRow,
} from '../../api/fetchStoreSelectorData';

import NewStoreModal from '../NewStoreModal/NewStoreModal';
import Popup from '../Popup/Popup';
import Loader from '../Loader/Loader';
import styles from './StoreSelector.module.css';

interface Props {
  source: StoreSelectorSource;
  onSelect: (store: {
    department: string;
    representative: string;
    store: string;
  }) => void;
  onBack?: () => void;
}

export default function StoreSelector({ source, onSelect, onBack }: Props) {
  const [department, setDepartment] = useState('');
  const [representative, setRepresentative] = useState('');
  const [store, setStore] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [localStores, setLocalStores] = useState<string[]>([]);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['store-selector-data', source],
    queryFn: () => fetchStoreSelectorData(source),
  });

  const normalizedData = useMemo<StoreSelectorRow[]>(() => {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.filter(
      item =>
        item &&
        typeof item.department === 'string' &&
        typeof item.representative === 'string' &&
        typeof item.store === 'string'
    );
  }, [data]);

  const departments = useMemo(() => {
    return [...new Set(normalizedData.map(item => item.department))].sort(
      (a, b) => a.localeCompare(b, 'uk')
    );
  }, [normalizedData]);

  const departmentRows = useMemo(() => {
    if (!department) {
      return [];
    }

    return normalizedData.filter(item => item.department === department);
  }, [normalizedData, department]);

  const representatives = useMemo(() => {
    return [...new Set(departmentRows.map(item => item.representative))].sort(
      (a, b) => a.localeCompare(b, 'uk')
    );
  }, [departmentRows]);

  const stores = useMemo(() => {
    if (!department || !representative) {
      return [];
    }

    const fromSheet = departmentRows
      .filter(item => item.representative === representative)
      .map(item => item.store);

    return [...new Set([...fromSheet, ...localStores])].sort((a, b) =>
      a.localeCompare(b, 'uk')
    );
  }, [department, representative, departmentRows, localStores]);

  function handleDepartmentChange(value: string) {
    setDepartment(value);
    setRepresentative('');
    setStore('');
  }

  function handleRepresentativeChange(value: string) {
    setRepresentative(value);
    setStore('');
  }

  function handleConfirm() {
    if (!department || !representative || !store) {
      setPopupMessage('Оберіть всі поля');
      return;
    }

    onSelect({
      department,
      representative,
      store,
    });
  }

  if (isLoading) {
    return <Loader />;
  }

  if (isError) {
    return (
      <div className={styles.wrapper}>
        <p>Не вдалося завантажити список торгових точок.</p>
        {onBack && (
          <button className={styles.backButton} onClick={onBack}>
            ← Головна сторінка
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <select
        className={styles.select}
        value={department}
        onChange={e => handleDepartmentChange(e.target.value)}
      >
        <option value="" disabled hidden>
          Відділ
        </option>

        {departments.map(item => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <select
        className={styles.select}
        value={representative}
        disabled={!department}
        onChange={e => handleRepresentativeChange(e.target.value)}
      >
        <option value="" disabled hidden>
          Торговий представник
        </option>

        {representatives.map(item => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <select
        className={styles.select}
        value={store}
        disabled={!representative}
        onChange={e => setStore(e.target.value)}
      >
        <option value="" disabled hidden>
          Торгова точка
        </option>

        {stores.map(item => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <button
        className={styles.newStoreButton}
        onClick={() => setShowModal(true)}
        disabled={!department || !representative}
      >
        ➕ Нова торгова точка (якщо немає в списку)
      </button>

      <button className={styles.confirmButton} onClick={handleConfirm}>
        Далі
      </button>

      {onBack && (
        <button className={styles.backButton} onClick={onBack}>
          ← Головна сторінка
        </button>
      )}

      {showModal && (
        <NewStoreModal
          department={department}
          representative={representative}
          onClose={() => setShowModal(false)}
          onCreated={newStore => {
            setLocalStores(prev =>
              prev.includes(newStore) ? prev : [...prev, newStore]
            );
            setStore(newStore);
            setShowModal(false);
          }}
        />
      )}

      {popupMessage && (
        <Popup message={popupMessage} onClose={() => setPopupMessage(null)} />
      )}
    </div>
  );
}
