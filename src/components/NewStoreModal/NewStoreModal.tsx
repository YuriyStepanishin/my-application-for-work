import { useState } from 'react';
import { addStore } from '../../api/addStore';
import Loader from '../Loader/Loader';
import Popup from '../Popup/Popup';
import styles from './NewStoreModal.module.css';

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
  const [popupMessage, setPopupMessage] = useState<string | null>(null);

  async function handleSave() {
    if (!store) {
      setPopupMessage('Введіть назву ТТ');
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
        setPopupMessage(res.error || 'Помилка збереження');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {saving && <Loader />}

        <div className={styles.title}>Заведення нової торгової точки</div>

        <input
          className={styles.input}
          value={store}
          onChange={e => setStore(e.target.value)}
          placeholder="Введіть назву"
        />

        <button
          className={styles.saveButton}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Збереження...' : 'Зберегти'}
        </button>

        <button className={styles.cancelButton} onClick={onClose}>
          Скасувати
        </button>

        {popupMessage && (
          <Popup message={popupMessage} onClose={() => setPopupMessage(null)} />
        )}
      </div>
    </div>
  );
}
