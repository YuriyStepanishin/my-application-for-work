import { useState } from 'react';

import { saveReport } from '../../api/saveReport';

import PhotoUpload from '../PhotoUpload/PhotoUpload';

import styles from '../ReportDetailsForm/ReportDetailsForm.module.css';

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

export default function ReportBonusForm({ storeData, onBack }: Props) {
  const [createdDate, setCreatedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [category, setCategory] = useState('');

  const [comment, setComment] = useState('');

  const [photos, setPhotos] = useState<Photo[]>([]);

  const [saving, setSaving] = useState(false);

  const [success, setSuccess] = useState(false);

  async function handleSave() {
    if (!createdDate) {
      alert('Оберіть дату створення');
      return;
    }

    if (!category) {
      alert('Оберіть категорію');
      return;
    }

    try {
      setSaving(true);

      const result = await saveReport(
        {
          department: storeData.department,
          representative: storeData.representative,
          store: storeData.store,

          createdDate, // ← ключова різниця

          category,
          comment,

          photos,
        },
        'bonus'
      ); // ← важливо вказати тип

      if (result.success) {
        setSuccess(true);

        setComment('');
        setPhotos([]);

        setTimeout(onBack, 1500);
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
      <div className={styles.title}>{storeData.store}</div>

      <div className={styles.subtitle}>
        {storeData.department} • {storeData.representative}
      </div>

      <label className={styles.label}>Дата створення</label>

      <input
        type="date"
        value={createdDate}
        onChange={e => setCreatedDate(e.target.value)}
        className={styles.input}
      />

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

      <PhotoUpload photos={photos} setPhotos={setPhotos} />

      <label className={styles.label}>Коментар</label>

      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        className={styles.textarea}
      />

      {success && (
        <div className={styles.successMessage}>✅ Звіт успішно збережено</div>
      )}

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
