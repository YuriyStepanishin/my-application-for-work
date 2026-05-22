import { useEffect, useMemo, useState } from 'react';
import styles from './DateTime.module.css';

export default function DateTime() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  const kyivWeekdayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('uk-UA', {
        timeZone: 'Europe/Kyiv',
        weekday: 'long',
      }),
    []
  );

  const kyivDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('uk-UA', {
        timeZone: 'Europe/Kyiv',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    []
  );

  const kyivTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('uk-UA', {
        timeZone: 'Europe/Kyiv',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }),
    []
  );

  const kyivWeekday = kyivWeekdayFormatter
    .format(currentTime)
    .replace(/^./, letter => letter.toUpperCase());
  const kyivDate = kyivDateFormatter.format(currentTime);
  const kyivTime = kyivTimeFormatter.format(currentTime);

  return (
    <div className={styles.kyivDateTime} aria-live="polite" aria-atomic="true">
      <span className={styles.kyivDateTimeLabel}>Хмельницький</span>
      <strong className={styles.kyivDateTimeValue}>{kyivTime}</strong>
      <span className={styles.kyivDateTimeSub}>
        {kyivWeekday}, {kyivDate}
      </span>
    </div>
  );
}
