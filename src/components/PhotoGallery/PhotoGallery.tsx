import { useState, useRef, useMemo } from 'react';
import styles from './PhotoGallery.module.css';
import { useQuery } from '@tanstack/react-query';
import { BONUS_API_URL } from '../../api/config';
import Loader from '../Loader/Loader';

interface Props {
  onBack: () => void;
}

type Photo = {
  id: string;
  sources: string[];
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
  photos: unknown;
};

async function fetchReports(): Promise<Report[]> {
  const res = await fetch(`${BONUS_API_URL}?action=getReports`);

  if (!res.ok) {
    throw new Error('Помилка завантаження фото');
  }

  const json = await res.json();
  return json.data;
}

function extractDriveId(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  const fromQuery = trimmed.match(/[?&]id=([^&]+)/)?.[1] ?? '';
  const fromPath = trimmed.match(/\/d\/([^/]+)/)?.[1] ?? '';
  const rawId = fromQuery || fromPath;

  return rawId.match(/[A-Za-z0-9_-]+/)?.[0] ?? '';
}

function buildImageSources(url: string): string[] {
  const trimmed = url.trim();
  if (!trimmed) return [];

  const driveId = extractDriveId(trimmed);
  if (!driveId) return [trimmed];

  return [
    `https://lh3.googleusercontent.com/d/${driveId}=w1600`,
    `https://drive.google.com/uc?export=view&id=${driveId}`,
    `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`,
  ];
}

function normalizePhotoUrls(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map(item => String(item ?? '').trim()).filter(Boolean);
  }

  if (typeof input !== 'string') {
    return [];
  }

  const raw = input.trim();
  if (!raw) return [];

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item ?? '').trim()).filter(Boolean);
      }
    } catch {
      // Fallback below.
    }
  }

  return raw
    .split(/[\n,;]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

export default function PhotoGallery({ onBack }: Props) {
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [department, setDepartment] = useState('all');
  const [rep, setRep] = useState('all');
  const [sourceIndexByPhotoId, setSourceIndexByPhotoId] = useState<
    Record<string, number>
  >({});

  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const lastTouch = useRef<number | null>(null);
  const lastDistance = useRef<number | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  function getDistance(touches: React.TouchList) {
    const a = touches[0];
    const b = touches[1];
    if (!a || !b) return 0;

    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  const {
    data: photos = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['photos'],
    queryFn: fetchReports,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    select: (reports: Report[]): Photo[] => {
      const transformed = reports.flatMap((report, reportIndex) =>
        normalizePhotoUrls(report.photos).map((rawUrl, photoIndex) => {
          const sources = buildImageSources(rawUrl);
          if (sources.length === 0) return null;

          return {
            id: `${report.date}-${report.store}-${reportIndex}-${photoIndex}`,
            sources,
            store: report.store,
            category: report.category,
            date: report.date,
            lat: 0,
            lng: 0,
            department: report.department,
            rep: report.representative,
          };
        })
      );

      return transformed.filter((photo): photo is Photo => photo !== null);
    },
  });

  const departments = useMemo(() => {
    return [
      'all',
      ...Array.from(new Set(photos.map(p => p.department).filter(Boolean))),
    ];
  }, [photos]);

  const reps = useMemo(() => {
    return [
      'all',
      ...Array.from(
        new Set(
          photos
            .filter(p => department === 'all' || p.department === department)
            .map(p => p.rep)
            .filter(Boolean)
        )
      ),
    ];
  }, [photos, department]);

  const filteredPhotos = useMemo(() => {
    return photos.filter(p => {
      const depOk = department === 'all' || p.department === department;
      const repOk = rep === 'all' || p.rep === rep;
      return depOk && repOk;
    });
  }, [photos, department, rep]);

  const filteredStoreCount = useMemo(() => {
    return new Set(filteredPhotos.map(photo => photo.store).filter(Boolean))
      .size;
  }, [filteredPhotos]);

  const filteredPhotoCount = filteredPhotos.length;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastDistance.current = getDistance(e.touches);
    }

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

  const handleWheel = (e: React.WheelEvent<HTMLImageElement>) => {
    e.preventDefault();

    setZoom(prev => {
      const next = Math.min(Math.max(prev - e.deltaY * 0.01, 1), 5);
      if (next === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (zoom <= 1 || e.button !== 0) return;
    isDragging.current = true;
    lastPoint.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isDragging.current || zoom <= 1 || !lastPoint.current) return;

    const dx = e.clientX - lastPoint.current.x;
    const dy = e.clientY - lastPoint.current.y;

    setPosition(prev => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));

    lastPoint.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    lastPoint.current = null;
  };

  const handleDoubleClick = () => {
    setZoom(prev => {
      const next = prev > 1 ? 1 : 2;
      if (next === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  if (isLoading) return <Loader />;
  if (error) return <div>Щось зламалось 😅</div>;

  return (
    <>
      <div className={styles.container}>
        <div
          className={`${styles.stats} ${activePhoto ? styles.filtersHidden : ''}`}
        >
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Кількість ТТ</span>
            <strong className={styles.statValue}>{filteredStoreCount}</strong>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Кількість фото</span>
            <strong className={styles.statValue}>{filteredPhotoCount}</strong>
          </div>
        </div>

        <div
          className={`${styles.filters} ${activePhoto ? styles.filtersHidden : ''}`}
        >
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
                {r === 'all' ? 'Усі торгові представники' : r}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.list}>
          {filteredPhotos.length === 0 && (
            <div className={styles.empty}>Немає фото</div>
          )}

          {filteredPhotos.map(photo => (
            <div
              key={photo.id}
              className={styles.card}
              onClick={() => {
                const sourceIndex = sourceIndexByPhotoId[photo.id] ?? 0;
                setActivePhoto(photo.sources[sourceIndex] || photo.sources[0]);
                setZoom(1);
                setPosition({ x: 0, y: 0 });
              }}
            >
              <img
                src={photo.sources[sourceIndexByPhotoId[photo.id] ?? 0]}
                loading="lazy"
                className={styles.image}
                onError={() => {
                  setSourceIndexByPhotoId(prev => {
                    const current = prev[photo.id] ?? 0;
                    const next = current + 1;

                    if (next >= photo.sources.length) return prev;

                    return {
                      ...prev,
                      [photo.id]: next,
                    };
                  });
                }}
              />

              <div className={styles.info}>
                <div>ТТ: {photo.store}</div>
                <div>Категорія: {photo.category}</div>
                <div>{photo.date}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          className={`${styles.backButton} ${activePhoto ? styles.backButtonHidden : ''}`}
          onClick={onBack}
        >
          ← Назад
        </button>
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
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
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
