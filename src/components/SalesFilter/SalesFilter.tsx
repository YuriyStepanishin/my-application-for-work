import styles from './SalesFilter.module.css';

type Props = {
  departments: string[];
  agents: string[];
  department: string;
  agent: string;
  dateFrom: string;
  dateTo: string;
  onChangeDepartment: (v: string) => void;
  onChangeAgent: (v: string) => void;
  onChangeDateFrom: (v: string) => void;
  onChangeDateTo: (v: string) => void;
};

export default function SalesFilter({
  departments,
  agents,
  department,
  agent,
  dateFrom,
  dateTo,
  onChangeDepartment,
  onChangeAgent,
  onChangeDateFrom,
  onChangeDateTo,
}: Props) {
  return (
    <div className={styles.filters}>
      <section className={styles.section}>
        <div className={styles.dateRange}>
          <div className={styles.dateField}>
            <label className={styles.dateLabel}>З</label>
            <input
              type="date"
              className={styles.dateInput}
              value={dateFrom}
              onChange={e => onChangeDateFrom(e.target.value)}
            />
          </div>

          <span className={styles.dateSeparator}>-</span>

          <div className={styles.dateField}>
            <label className={styles.dateLabel}>По</label>
            <input
              type="date"
              className={styles.dateInput}
              value={dateTo}
              onChange={e => onChangeDateTo(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.selectStack}>
          <select
            className={styles.select}
            value={department}
            onChange={e => {
              onChangeDepartment(e.target.value);
              onChangeAgent('');
            }}
          >
            <option value="">Всі відділи</option>
            {departments.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            className={styles.select}
            value={agent}
            onChange={e => onChangeAgent(e.target.value)}
          >
            <option value="">Всі торгові представники</option>
            {agents.map(a => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </section>
    </div>
  );
}
