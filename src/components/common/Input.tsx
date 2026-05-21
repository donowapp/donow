'use client';

interface InputProps {
  label?: string;
  id?: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  required?: boolean;
}

export function Input({ label, id, type = 'text', value, onChange, placeholder, error, className = '', required = false }: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="w-full mb-4">
      {label && <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700 mb-2">{label}{required && <span className="text-red-500">*</span>}</label>}
      <input id={inputId} type={type} value={value} onChange={onChange} placeholder={placeholder} className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition ${className}`} />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
