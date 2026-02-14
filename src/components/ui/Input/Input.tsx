interface Props {
  value: string;

  onChange: (value: string) => void;

  placeholder?: string;

  type?: string;

  readOnly?: boolean;
}

export default function Input({
  value,

  onChange,

  placeholder,

  type = 'text',

  readOnly = false,
}: Props) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      readOnly={readOnly}
      onChange={e => onChange(e.target.value)}
    />
  );
}
