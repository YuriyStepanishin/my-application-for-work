import { useState, useRef } from 'react';
import styles from './PhotoGallery.module.css';
import { useQuery } from '@tanstack/react-query';
import { BONUS_API_URL } from '../../api/config';
import Loader from '../Loader/Loader';

interface Props {
  onBack: () => void;
}

type Photo = {
  id: string;
  url: string;
  store: string;
  category: string;
  date: string;
  lat: number;
  lng: number;
  department: string;
  rep: string;
};

type Report = {
  department: string;
  representative: string;
  store: string;
  date: string;
  category: string;
  photos: string[];
};

async function fetchPhotos(): Promise<Photo[]> {
  const res = await fetch(`${BONUS_API_URL}?action=getReports`);

  if (!res.ok) {
    throw new Error('Помилка завантаження фото');
  }

  const json = await res.json();
  const reports: Report[] = json.data;

  return reports.flatMap((report, index) =>
    report.photos.map((url, i) => ({
      id: `${index}_${i}`,
      url,
      store: report.store,
      category: report.category,
      date: report.date,
      lat: 0,
      lng: 0,
      department: report.department,
      rep: report.representative,
    }))
  );
}

function convertDriveUrl(url: string) {
  const idMatch = url.match(/id=([^&]+)/);
  if (!idMatch) return url;
  const id = idMatch[1];
  return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
}

export default function PhotoGallery({ onBack }: Props) {
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [department, setDepartment] = useState('all');
  const [rep, setRep] = useState('all');

  // 👉 zoom + drag
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const lastTouch = useRef<number | null>(null);
  const lastDistance = useRef<number | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  function getDistance(touches: React.TouchList) {
    const a = touches[0];
    const b = touches[1];

    if (!a || !b) return 0;

    return Math.sqrt(
      Math.pow(a.clientX - b.clientX, 2) + Math.pow(a.clientY - b.clientY, 2)
    );
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastDistance.current = getDistance(e.touches);
    }

    // double tap
    const now = Date.now();
    if (lastTouch.current && now - lastTouch.current < 300) {
      setZoom(prev => (prev > 1 ? 1 : 2));
    }
    lastTouch.current = now;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = getDistance(e.touches);

      if (lastDistance.current) {
        const scale = distance / lastDistance.current;
        setZoom(prev => Math.min(Math.max(prev * scale, 1), 5));
      }

      lastDistance.current = distance;
    }

    if (e.touches.length === 1 && zoom > 1) {
      const touch = e.touches[0];

      if (lastPoint.current) {
        const dx = touch.clientX - lastPoint.current.x;
        const dy = touch.clientY - lastPoint.current.y;

        setPosition(prev => ({
          x: prev.x + dx,
          y: prev.y + dy,
        }));
      }

      lastPoint.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
    }
  };

  const handleTouchEnd = () => {
    lastDistance.current = null;
    lastPoint.current = null;
  };

  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ['photos'],
    queryFn: fetchPhotos,
    refetchOnMount: true,
  });

  if (isLoading) {
    return <Loader />;
  }

  const departments = [
    'all',
    ...Array.from(new Set(photos.map(p => p.department).filter(Boolean))),
  ];

  const reps = [
    'all',
    ...Array.from(
      new Set(
        photos
          .filter(p => department === 'all' || p.department === department)
          .map(p => p.rep)
      )
    ),
  ];

  const filteredPhotos = photos.filter(p => {
    const depOk = department === 'all' || p.department === department;
    const repOk = rep === 'all' || p.rep === rep;
    return depOk && repOk;
  });

  return (
    <>
      <div className={styles.container}>
        <div className={styles.filters}>
          <select
            className={styles.select}
            value={department}
            onChange={e => {
              setDepartment(e.target.value);
              setRep('all');
            }}
          >
            {departments.map(dep => (
              <option key={dep} value={dep}>
                {dep === 'all' ? 'Усі відділи' : dep}
              </option>
            ))}
          </select>

          <select
            className={styles.select}
            value={rep}
            onChange={e => setRep(e.target.value)}
          >
            {reps.map(r => (
              <option key={r} value={r}>
                {r === 'all' ? 'Усі ТП' : r}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.list}>
          {filteredPhotos.length === 0 && (
            <div className={styles.empty}>Немає фото для вибраних фільтрів</div>
          )}

          {filteredPhotos.map(photo => (
            <div
              key={photo.id}
              className={styles.card}
              onClick={() => {
                setActivePhoto(convertDriveUrl(photo.url));
                setZoom(1);
                setPosition({ x: 0, y: 0 });
              }}
            >
              <img
                src={convertDriveUrl(photo.url)}
                loading="lazy"
                className={styles.image}
              />

              <div className={styles.info}>
                <div>ТТ: {photo.store}</div>
                <div>Категорія: {photo.category}</div>
                <div>{photo.date}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <button className={styles.backButton} onClick={onBack}>
            ← Головна сторінка
          </button>
        </div>
      </div>

      {activePhoto && (
        <div className={styles.viewer} onClick={() => setActivePhoto(null)}>
          <button
            className={styles.closeBtn}
            onClick={() => setActivePhoto(null)}
          >
            ✕
          </button>

          <img
            src={activePhoto}
            className={styles.viewerImage}
            onClick={e => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            }}
          />
        </div>
      )}
    </>
  );
}
