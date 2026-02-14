import styles from './Input.module.css';
import type { InputHTMLAttributes } from 'react';

export default function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={styles.input} />;
}
