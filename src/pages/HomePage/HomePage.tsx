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
        overflow: 'hidden',
      }}
    >
      {/* фон */}
      <img
        src={bg}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          top: 0,
          left: 0,
          zIndex: 0,
        }}
      />

      {/* контейнер кнопок */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '0',
          width: '100%',
          display: 'flex',
          justifyContent: 'space-evenly',
          padding: '0 10px',
          zIndex: 1,
        }}
      >
        {/* кнопка 1 */}
        <button
          onClick={() => alert('В розробці')}
          style={{
            flex: 1,
            marginRight: '10px',
            height: '60px',
            fontSize: '18px',
            fontWeight: '600',
            borderRadius: '12px',
            border: 'none',
            background: '#ffffffcc',
            cursor: 'pointer',
          }}
        >
          Показники роботи
        </button>

        {/* кнопка 2 */}
        <button
          onClick={onOpenReport}
          style={{
            flex: 1,
            marginLeft: '10px',
            height: '60px',
            fontSize: '18px',
            fontWeight: '600',
            borderRadius: '12px',
            border: 'none',
            background: '#ffffffcc',
            cursor: 'pointer',
          }}
        >
          Акція вітрини
        </button>
      </div>
    </div>
  );
}
