import { useState } from 'react';
import { addStore } from '../../api/addStore';

interface Props {
  department: string;
  representative: string;

  onClose: () => void;

  onCreated: (store: string) => void;
}

export default function NewStoreModal({
  department,
  representative,
  onClose,
  onCreated,
}: Props) {
  const [store, setStore] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!store) {
      alert('Введіть назву ТТ');
      return;
    }

    try {
      setSaving(true);

      const res = await addStore({
        department,
        representative,
        store,
      });

      if (res.success) {
        onCreated(store);

        onClose();
      } else {
        alert(res.error);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          background: 'white',
          padding: 20,
          borderRadius: 10,
          width: 300,
        }}
      >
        <h3>Нова ТТ</h3>

        <input
          value={store}
          onChange={e => setStore(e.target.value)}
          placeholder="Назва ТТ"
        />

        <br />
        <br />

        <button onClick={handleSave} disabled={saving}>
          {saving ? 'Збереження...' : 'Зберегти'}
        </button>

        <br />
        <br />

        <button onClick={onClose}>Скасувати</button>
      </div>
    </div>
  );
}
