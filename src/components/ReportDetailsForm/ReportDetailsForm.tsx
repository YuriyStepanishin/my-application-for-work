import { useState } from 'react';

import { saveReport } from '../../api/saveReport';

import PhotoUpload from '../PhotoUpload/PhotoUpload';

import styles from './ReportDetailsForm.module.css';

interface Props {
  storeData: {
    department: string;
    representative: string;
    store: string;
  };

  onBack: () => void;
}

interface Photo {
  base64: string;
  type: string;
  name: string;
}

export default function ReportDetailsForm({ storeData, onBack }: Props) {
  const [startDate, setStartDate] = useState('');

  const [endDate, setEndDate] = useState('');

  const [category, setCategory] = useState('');

  const [comment, setComment] = useState('');

  const [photos, setPhotos] = useState<Photo[]>([]);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleStartDate(value: string) {
    setStartDate(value);

    const d = new Date(value);

    d.setDate(d.getDate() + 42);

    setEndDate(d.toISOString().split('T')[0]);
  }

  async function handleSave() {
    if (!startDate) {
      alert('Оберіть дату початку');
      return;
    }

    if (!category) {
      alert('Оберіть категорію');
      return;
    }

    try {
      setSaving(true);

      const result = await saveReport({
        department: storeData.department,
        representative: storeData.representative,
        store: storeData.store,

        startDate,
        endDate,

        category,
        comment,

        photos,
      });

      if (result.success) {
        setSuccess(true);

        setComment('');
        setPhotos([]);

        setTimeout(() => {
          onBack();
        }, 1500);
      } else {
        alert(result.error || 'Помилка');
      }
    } catch {
      alert('Server error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      {/* STORE TITLE */}
      <div className={styles.title}>{storeData.store}</div>

      <div className={styles.subtitle}>
        {storeData.department} • {storeData.representative}
      </div>

      {/* START DATE */}
      <label className={styles.label}>Дата початку</label>

      <input
        type="date"
        value={startDate}
        onChange={e => handleStartDate(e.target.value)}
        className={styles.input}
      />

      {/* END DATE (READ ONLY) */}
      <label className={styles.label}>Дата закінчення</label>

      <input
        type="text"
        value={endDate}
        readOnly
        className={`${styles.input} ${styles.readonly}`}
      />

      {/* CATEGORY */}
      <label className={styles.label}>Категорія</label>

      <select
        value={category}
        onChange={e => setCategory(e.target.value)}
        className={styles.input}
      >
        <option value="">Оберіть категорію</option>

        <option value="1">1 (1–6 м.)</option>
        <option value="2">2 (6–9 м.)</option>
        <option value="3">3 (9–15 м.)</option>
        <option value="4">4 (15–30 м.)</option>
        <option value="5">5 (30+ м.)</option>
      </select>

      {/* PHOTO UPLOAD */}
      <PhotoUpload photos={photos} setPhotos={setPhotos} />

      {/* COMMENT */}
      <label className={styles.label}>Коментар</label>

      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        className={styles.textarea}
      />
      {success && (
        <div className={styles.successMessage}>✅ Звіт успішно збережено</div>
      )}

      {/* BOTTOM BUTTONS */}
      <div className={styles.bottomRow}>
        <button
          onClick={handleSave}
          disabled={saving}
          className={styles.saveButton}
        >
          {saving ? 'Збереження...' : 'ЗБЕРЕГТИ'}
        </button>

        <button onClick={onBack} className={styles.cancelButton}>
          Скасувати
        </button>
      </div>
    </div>
  );
}
