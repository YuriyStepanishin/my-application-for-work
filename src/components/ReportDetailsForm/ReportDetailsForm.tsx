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
        alert('✅ Звіт збережено');

        setComment('');
        setPhotos([]);
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
    <div className={styles.container}>
      <button className={styles.backButton} onClick={onBack}>
        ← Назад
      </button>

      <h2 className={styles.title}>{storeData.store}</h2>

      <div className={styles.info}>
        {storeData.department}
        {' • '}
        {storeData.representative}
      </div>

      <label className={styles.label}>Дата початку</label>

      <input
        type="date"
        value={startDate}
        onChange={e => handleStartDate(e.target.value)}
        className={styles.input}
      />

      <label className={styles.label}>Дата закінчення</label>

      <input type="date" value={endDate} readOnly className={styles.input} />

      <label className={styles.label}>Категорія</label>

      <select
        value={category}
        onChange={e => setCategory(e.target.value)}
        className={styles.input}
      >
        <option value="">Оберіть категорію</option>

        <option value="1">1 (1–6 п.м.)</option>

        <option value="2">2 (6–9 п.м.)</option>

        <option value="3">3 (9–15 п.м.)</option>

        <option value="4">4 (15–30 п.м.)</option>

        <option value="5">5 (30+ п.м.)</option>
      </select>

      <PhotoUpload photos={photos} setPhotos={setPhotos} />

      <label className={styles.label}>Коментар</label>

      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        className={styles.textarea}
      />

      <button
        onClick={handleSave}
        disabled={saving}
        className={styles.saveButton}
      >
        {saving ? 'Збереження...' : 'ЗБЕРЕГТИ'}
      </button>
    </div>
  );
}
