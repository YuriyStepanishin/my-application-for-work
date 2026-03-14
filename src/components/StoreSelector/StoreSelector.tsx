import { useMemo, useState } from 'react';
import type { SheetRow } from '../../types/sheet';

import NewStoreModal from '../NewStoreModal/NewStoreModal';
import styles from './StoreSelector.module.css';

interface Props {
  data: SheetRow[];
  onSelect: (store: {
    department: string;
    representative: string;
    store: string;
  }) => void;
  onBack?: () => void;
}

export default function StoreSelector({ data, onSelect, onBack }: Props) {
  const normalizedData = useMemo<SheetRow[]>(() => {
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

  const [department, setDepartment] = useState('');
  const [representative, setRepresentative] = useState('');
  const [store, setStore] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [localStores, setLocalStores] = useState<string[]>([]);

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
      alert('Оберіть всі поля');
      return;
    }

    onSelect({
      department,
      representative,
      store,
    });
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
    </div>
  );
}
