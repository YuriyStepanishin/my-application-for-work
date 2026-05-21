import { useState } from 'react';
import { useEffect } from 'react';

import { saveReport } from '../../api/saveReport';

import PhotoUpload from '../PhotoUpload/PhotoUpload';
import Loader from '../Loader/Loader';
import Popup from '../Popup/Popup';

import styles from './ShowcasePromotion.module.css';
import useGeolocation from '../../hooks/useGeolocation';
import type { Photo } from '../../types/photo';
import { db } from '../PhotoUpload/db';

interface Props {
  storeData: {
    department: string;
    representative: string;
    store: string;
  };

  onBack: () => void;
}

export default function ShowcasePromotion({ storeData, onBack }: Props) {
  const { getLocation } = useGeolocation();

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const [startDate, setStartDate] = useState('');

  const [endDate, setEndDate] = useState('');

  const [category, setCategory] = useState('');

  const [comment, setComment] = useState('');

  const [photos, setPhotos] = useState<Photo[]>([]);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);

  function handleStartDate(value: string) {
    setStartDate(value);

    const d = new Date(value);

    d.setDate(d.getDate() + 42);

    setEndDate(d.toISOString().split('T')[0]);
  }

  async function handleSave() {
    if (!startDate) {
      setPopupMessage('Оберіть дату початку');
      return;
    }

    if (!category) {
      setPopupMessage('Оберіть категорію');
      return;
    }

    try {
      setSaving(true);

      const geo = await getLocation(); // ← отримуємо координати
      const dbPhotos = await db.photos.toArray();
      const captureDate = dbPhotos.find(photo => photo.capturedAt)?.capturedAt;

      const result = await saveReport(
        {
          department: storeData.department,
          representative: storeData.representative,
          store: storeData.store,

          startDate,
          endDate,

          category,
          comment,

          photos: dbPhotos,

          lat: geo.lat,
          lng: geo.lng,

          date:
            captureDate || startDate || new Date().toISOString().slice(0, 10),
        },
        'display'
      );

      if (result.success) {
        setSuccess(true);

        setComment('');
        setPhotos([]);
        await db.photos.clear();

        setTimeout(() => {
          onBack();
        }, 1500);
      } else {
        setPopupMessage(result.error || 'Помилка');
      }
    } catch {
      setPopupMessage('Server error');
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className={styles.wrapper}>
      {saving && <Loader />}

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

      {popupMessage && (
        <Popup message={popupMessage} onClose={() => setPopupMessage(null)} />
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
