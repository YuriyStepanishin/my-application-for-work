import bg from '../../../public/tea&coffee (1).png';

interface Props {
  onOpenReport: () => void;
}

export default function HomePage({ onOpenReport }: Props) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
      }}
    >
      {/* фон */}
      <img
        src={bg}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* ліва кнопка */}
      <button
        onClick={() => alert('В розробці')}
        style={{
          position: 'absolute',
          bottom: '5%',
          left: '12%',
          width: '240px',
          height: '240px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <img
          src="/icons/icon_pokaznyky_roboty_warm (1).png"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </button>

      {/* права кнопка → StoreSelector */}
      <button
        onClick={onOpenReport}
        style={{
          position: 'absolute',
          bottom: '5%',
          right: '20%',
          width: '240px',
          height: '240px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <img
          src="/icons/icon_aktsiya_vitryny_warm (1).png"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </button>
    </div>
  );
}
