import styles from './Button.module.css';
import type { ButtonHTMLAttributes } from 'react';

export default function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={styles.button} />;
}
