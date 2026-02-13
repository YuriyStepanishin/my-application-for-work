import styles from './Button.module.css';

interface Props {
  children: React.ReactNode;

  onClick?: () => void;

  variant?: 'primary' | 'success' | 'danger' | 'secondary';

  disabled?: boolean;

  type?: 'button' | 'submit';
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${styles.button}
        ${styles[variant]}
        ${disabled ? styles.disabled : ''}
      `}
    >
      {children}
    </button>
  );
}
