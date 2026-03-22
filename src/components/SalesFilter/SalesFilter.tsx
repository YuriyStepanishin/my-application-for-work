import styles from './SalesFilter.module.css';

type Props = {
  departments: string[];
  agents: string[];
  department: string;
  agent: string;
  onChangeDepartment: (v: string) => void;
  onChangeAgent: (v: string) => void;
};

export default function SalesFilter({
  departments,
  agents,
  department,
  agent,
  onChangeDepartment,
  onChangeAgent,
}: Props) {
  return (
    <div className={styles.filters}>
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
        <option value="">Всі ТП</option>
        {agents.map(a => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </div>
  );
}
