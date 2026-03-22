import { useRef, useState, type ChangeEvent } from 'react';
import imageCompression from 'browser-image-compression';
import styles from './PhotoUpload.module.css';
import { db } from './db';
import type { Photo } from '../../types/photo';
import Loader from '../Loader/Loader';

interface Props {
  photos: Photo[];
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
}

export default function PhotoUpload({ photos, setPhotos }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  const compressionOptions = {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 2600,
    initialQuality: 0.9,
    useWebWorker: true,
  };

  async function fileToBase64(file: File): Promise<Photo> {
    const compressed = await imageCompression(file, compressionOptions);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];

        resolve({
          id: crypto.randomUUID(),
          base64,
          type: compressed.type,
          name: compressed.name,
          status: 'pending',
        });
      };

      reader.onerror = reject;
      reader.readAsDataURL(compressed);
    });
  }

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);

    if (photos.length + files.length > 3) {
      alert('Максимум 3 фото');
      return;
    }

    try {
      setProcessing(true);
      const newPhotos = await Promise.all(files.map(fileToBase64));

      for (const p of newPhotos) {
        await db.photos.put(p);
      }

      const fresh = await db.photos.toArray();
      setPhotos(fresh);
    } catch (err) {
      console.error(err);
      alert('Помилка обробки фото');
    } finally {
      setProcessing(false);
    }

    e.target.value = '';
  }

  async function removePhoto(id: string) {
    try {
      setProcessing(true);
      await db.photos.delete(id);

      const fresh = await db.photos.toArray();
      setPhotos(fresh);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className={styles.container}>
      {processing && <Loader />}

      <label className={styles.label}>Фото (макс 3)</label>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className={styles.hiddenInput}
      />

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        className={styles.hiddenInput}
      />

      <div className={styles.buttons}>
        <button
          onClick={() => cameraRef.current?.click()}
          className={styles.button}
          disabled={processing}
        >
          📷 Зробити фото
        </button>

        <button
          onClick={() => galleryRef.current?.click()}
          className={styles.button}
          disabled={processing}
        >
          🖼 З галереї
        </button>
      </div>

      <div className={styles.previewContainer}>
        {photos.map(photo => (
          <div key={photo.id} className={styles.previewItem}>
            <img
              src={`data:${photo.type};base64,${photo.base64}`}
              className={styles.previewImage}
            />

            <button
              onClick={() => removePhoto(photo.id)}
              className={styles.removeButton}
              disabled={processing}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
