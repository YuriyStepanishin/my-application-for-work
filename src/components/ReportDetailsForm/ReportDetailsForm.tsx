import { useState } from 'react';
import { saveReport } from '../../api/saveReport';

import Button from '../ui/Button/Button';
import Input from '../ui/Input/Input';

import styles from './ReportDetailsForm.module.css';

interface Props {
  storeData: {
    department: string;
    representative: string;
    store: string;
  };
  onBack: () => void;
}

export default function ReportDetailsForm({ storeData, onBack }: Props) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [photos, setPhotos] = useState<File[]>([]);
  const [comment, setComment] = useState('');

  const [saving, setSaving] = useState(false);

  function handleStartDate(value: string) {
    setStartDate(value);

    const d = new Date(value);
    d.setDate(d.getDate() + 42);

    setEndDate(d.toISOString().split('T')[0]);
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);

    if (photos.length + files.length > 3) {
      alert('Максимум 3 фото');
      return;
    }

    setPhotos(prev => [...prev, ...files]);
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    try {
      setSaving(true);

      const res = await saveReport({
        ...storeData,

        startDate,
        endDate,
        comment,
        photos,
      });

      if (res.success) {
        alert('Звіт збережено');

        setPhotos([]);
        setComment('');
      } else {
        alert(res.error);
      }
    } catch {
      alert('Server error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.container}>
      <Button variant="secondary" onClick={onBack}>
        ← Назад
      </Button>

      <div className={styles.title}>{storeData.store}</div>

      <Input
        label="Дата початку"
        type="date"
        value={startDate}
        onChange={handleStartDate}
      />

      <Input
        label="Дата закінчення"
        type="date"
        value={endDate}
        onChange={() => {}}
      />

      <input
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handlePhoto}
      />

      <div className={styles.photos}>
        {photos.map((photo, index) => (
          <div key={index}>
            <img src={URL.createObjectURL(photo)} className={styles.image} />

            <Button variant="danger" onClick={() => removePhoto(index)}>
              Видалити
            </Button>
          </div>
        ))}
      </div>

      <Input label="Коментар" value={comment} onChange={setComment} />

      <Button variant="success" onClick={handleSave} disabled={saving}>
        {saving ? 'Збереження...' : 'Зберегти'}
      </Button>
    </div>
  );
}
