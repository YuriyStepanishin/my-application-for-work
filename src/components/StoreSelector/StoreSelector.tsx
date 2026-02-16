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
  onBack: () => void;
}

export default function StoreSelector({ data, onSelect, onBack }: Props) {
  const [department, setDepartment] = useState('');
  const [representative, setRepresentative] = useState('');
  const [store, setStore] = useState('');

  const [showModal, setShowModal] = useState(false);

  const [localStores, setLocalStores] = useState<string[]>([]);

  const departments = useMemo(
    () => [...new Set(data.map(d => d['Відділ']))],
    [data]
  );

  const representatives = useMemo(
    () => [
      ...new Set(
        data
          .filter(d => d['Відділ'] === department)
          .map(d => d['Торговий агент'])
      ),
    ],
    [data, department]
  );

  const stores = useMemo(() => {
    const fromSheet = data
      .filter(
        d =>
          d['Відділ'] === department && d['Торговий агент'] === representative
      )
      .map(d => d['ТТ']);

    return [...new Set([...fromSheet, ...localStores])];
  }, [data, department, representative, localStores]);

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
        onChange={e => {
          setDepartment(e.target.value);
          setRepresentative('');
          setStore('');
        }}
      >
        <option value="" disabled hidden>
          Відділ
        </option>

        {departments.map(d => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <select
        className={styles.select}
        value={representative}
        disabled={!department}
        onChange={e => {
          setRepresentative(e.target.value);
          setStore('');
        }}
      >
        <option value="" disabled hidden>
          Торговий представник
        </option>

        {representatives.map(r => (
          <option key={r} value={r}>
            {r}
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

        {stores.map(s => (
          <option key={s} value={s}>
            {s}
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

      <button className={styles.backButton} onClick={onBack}>
        ← Головна сторінка
      </button>

      {showModal && (
        <NewStoreModal
          department={department}
          representative={representative}
          onClose={() => setShowModal(false)}
          onCreated={newStore => {
            setLocalStores(prev => [...prev, newStore]);

            setStore(newStore);

            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
