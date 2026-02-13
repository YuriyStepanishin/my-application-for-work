import type { Dispatch, SetStateAction } from 'react';

type Props = {
  photos: File[];
  setPhotos: Dispatch<SetStateAction<File[]>>;
};

export default function PhotoUpload({ photos, setPhotos }: Props) {
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);

    if (photos.length + files.length > 3) {
      alert('Максимум 3 фото');
      return;
    }

    setPhotos(prev => [...prev, ...files]);

    e.target.value = '';
  }

  function removePhoto(index: number) {
    setPhotos(photos.filter((_, i) => i !== index));
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handlePhotoChange}
      />

      <div>Фото: {photos.length} / 3</div>

      <br />

      {photos.map((p, i) => (
        <div key={i}>
          <img src={URL.createObjectURL(p)} width="120" />

          <br />

          <button onClick={() => removePhoto(i)}>Видалити</button>
        </div>
      ))}
    </div>
  );
}
