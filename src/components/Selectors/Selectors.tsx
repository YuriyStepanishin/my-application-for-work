import { useMemo, useState } from 'react';
import type { SheetRow } from '../../types/sheet';

type Props = {
  data: SheetRow[];

  department: string;
  representative: string;
  store: string;

  setDepartment: (v: string) => void;
  setRepresentative: (v: string) => void;
  setStore: (v: string) => void;
};

export default function Selectors({
  data,

  department,
  representative,
  store,

  setDepartment,
  setRepresentative,
  setStore,
}: Props) {
  const [isNewStore, setIsNewStore] = useState(false);

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

  const stores = useMemo(
    () =>
      data
        .filter(
          d =>
            d['Відділ'] === department && d['Торговий агент'] === representative
        )
        .map(d => d['ТТ']),
    [data, department, representative]
  );

  return (
    <div>
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
          <option key={d}>{d}</option>
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
          <option key={r}>{r}</option>
        ))}
      </select>

      <br />
      <br />

      {!isNewStore ? (
        <select
          value={store}
          disabled={!representative}
          onChange={e => setStore(e.target.value)}
        >
          <option value="">ТТ</option>

          {stores.map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      ) : (
        <input
          value={store}
          onChange={e => setStore(e.target.value)}
          placeholder="Нова ТТ"
        />
      )}

      <br />
      <br />

      <button
        onClick={() => {
          setIsNewStore(!isNewStore);
          setStore('');
        }}
      >
        {isNewStore ? '← Назад' : '+ Нова ТТ'}
      </button>
    </div>
  );
}
