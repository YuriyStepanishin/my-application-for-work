import { useNavigate } from 'react-router-dom';
import bg from '../../assets/tea&coffee (1).png';

export default function HomePage() {
  const navigate = useNavigate();

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
      <div
        style={{
          position: 'absolute',
          bottom: '5%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '40px', // відстань між кнопками
        }}
      >
        {/* кнопка ліва */}
        <button
          onClick={() => alert('В розробці')}
          style={{
            position: 'absolute',

            bottom: '5%', // регулює висоту
            left: '12%', // регулює позицію зліва

            width: '340px',
            height: '340px',

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

        {/* кнопка права */}
        <button
          onClick={() => navigate('/report')}
          style={{
            position: 'absolute',

            bottom: '5%', // така ж висота
            right: '20%', // позиція справа

            width: '340px',
            height: '340px',

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
    </div>
  );
}
