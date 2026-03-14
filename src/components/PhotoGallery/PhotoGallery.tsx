import { useState } from 'react';
import styles from './PhotoGallery.module.css';
import { useQuery } from '@tanstack/react-query';
import { BONUS_API_URL } from '../../api/config';

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

  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ['photos'],
    queryFn: fetchPhotos,
    refetchOnMount: true,
  });

  if (isLoading) {
    return <div>Завантаження...</div>;
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
              onClick={() => setActivePhoto(convertDriveUrl(photo.url))}
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
                <div>
                  {photo.lat !== 0 && (
                    <div>
                      📍 {photo.lat}, {photo.lng}
                    </div>
                  )}
                </div>
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
          <img
            src={activePhoto}
            onClick={e => e.stopPropagation()}
            className={styles.viewerImage}
          />
        </div>
      )}
    </>
  );
}
