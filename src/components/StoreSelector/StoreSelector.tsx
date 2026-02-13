import { useMemo, useState } from 'react';
import type { SheetRow } from '../../types/sheet';

import NewStoreModal from '../NewStoreModal/NewStoreModal';

interface Props {
  data: SheetRow[];

  onSelect: (store: {
    department: string;
    representative: string;
    store: string;
  }) => void;
}

export default function StoreSelector({ data, onSelect }: Props) {
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
    <div style={{ padding: 20 }}>
      <h2>Оберіть торгову точку</h2>

      <select
        value={department}
        onChange={e => {
          setDepartment(e.target.value);
          setRepresentative('');
          setStore('');
        }}
      >
        <option value="">Відділ</option>

        {departments.map(d => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <br />
      <br />

      <select
        value={representative}
        disabled={!department}
        onChange={e => {
          setRepresentative(e.target.value);
          setStore('');
        }}
      >
        <option value="">ТП</option>

        {representatives.map(r => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <br />
      <br />

      <select
        value={store}
        disabled={!representative}
        onChange={e => setStore(e.target.value)}
      >
        <option value="">ТТ</option>

        {stores.map(s => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <br />
      <br />

      <button
        onClick={() => setShowModal(true)}
        disabled={!department || !representative}
      >
        ➕ Нова ТТ
      </button>

      <br />
      <br />

      <button onClick={handleConfirm}>Далі →</button>

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
