import { useState, useRef, useMemo } from 'react';
import styles from './PhotoGallery.module.css';
import { useQuery } from '@tanstack/react-query';
import SearchInput from '../SearchInput';
import {
  buildImageSources,
  fetchReports,
  normalizePhotoUrls,
  type Report,
} from '../../api/fetchReports';
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

export default function PhotoGallery({ onBack }: Props) {
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [department, setDepartment] = useState('all');
  const [rep, setRep] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
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
    queryKey: ['photo-reports'],
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
    const query = searchTerm.trim().toLowerCase();

    return photos.filter(p => {
      const depOk = department === 'all' || p.department === department;
      const repOk = rep === 'all' || p.rep === rep;
      const searchOk = !query || p.store.toLowerCase().includes(query);

      return depOk && repOk && searchOk;
    });
  }, [photos, department, rep, searchTerm]);

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
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Пошук ТТ"
            ariaLabel="Пошук фото за торговою точкою"
          />

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
