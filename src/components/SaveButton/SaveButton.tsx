type Props = {
  saving: boolean;
  onClick: () => void;
};

export default function SaveButton({ saving, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      style={{
        background: saving ? '#999' : '#2e7d32',
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: 6,
      }}
    >
      {saving ? 'Збереження...' : 'ЗБЕРЕГТИ'}
    </button>
  );
}
