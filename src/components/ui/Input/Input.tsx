import styles from './Input.module.css';

interface Props {
  label?: string;

  value: string;

  onChange: (value: string) => void;

  type?: string;

  placeholder?: string;
}

export default function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: Props) {
  return (
    <div className={styles.container}>
      {label && <label className={styles.label}>{label}</label>}

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={styles.input}
      />
    </div>
  );
}
