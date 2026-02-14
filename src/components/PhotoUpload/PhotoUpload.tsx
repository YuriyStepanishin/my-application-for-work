import { useRef, type ChangeEvent } from 'react';
import styles from './PhotoUpload.module.css';

export interface Photo {
  base64: string;
  type: string;
  name: string;
}

interface Props {
  photos: Photo[];
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
}

export default function PhotoUpload({ photos, setPhotos }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // ============================
  // File → base64
  // ============================

  function fileToBase64(file: File): Promise<Photo> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];

        resolve({
          base64,
          type: file.type,
          name: file.name,
        });
      };

      reader.onerror = reject;

      reader.readAsDataURL(file);
    });
  }

  // ============================
  // обробка вибору
  // ============================

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);

    if (photos.length + files.length > 3) {
      alert('Максимум 3 фото');
      return;
    }

    const newPhotos = await Promise.all(files.map(fileToBase64));

    setPhotos(prev => [...prev, ...newPhotos]);

    // очистити input щоб можна було вибрати те саме фото ще раз
    e.target.value = '';
  }

  // ============================
  // видалення
  // ============================

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }

  // ============================
  // UI
  // ============================

  return (
    <div className={styles.container}>
      <label className={styles.label}>Фото (макс 3)</label>

      {/* hidden inputs */}

      {/* камера */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className={styles.hiddenInput}
      />

      {/* галерея */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        className={styles.hiddenInput}
      />

      {/* кнопки */}
      <div className={styles.buttons}>
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className={styles.button}
        >
          📷 Зробити фото
        </button>

        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className={styles.button}
        >
          🖼 З галереї
        </button>
      </div>

      {/* preview */}
      <div className={styles.previewContainer}>
        {photos.map((photo, index) => (
          <div key={index} className={styles.previewItem}>
            <img
              src={`data:${photo.type};base64,${photo.base64}`}
              className={styles.previewImage}
            />

            <button
              type="button"
              onClick={() => removePhoto(index)}
              className={styles.removeButton}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
