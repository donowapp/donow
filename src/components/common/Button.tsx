'use client';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  type = 'button',
}: ButtonProps) {
  const baseStyles = 'font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-orange-500 text-white hover:bg-orange-600',
    secondary: 'bg-sky-600 text-white hover:bg-sky-700',
    outline: 'border-2 border-orange-500 text-orange-500 hover:bg-orange-50',
    ghost: 'text-orange-500 hover:bg-orange-50',
  };
  const sizes = { sm: 'px-3 py-1 text-sm', md: 'px-4 py-2 text-base', lg: 'px-6 py-3 text-lg' };
  return <button type={type} disabled={disabled} onClick={onClick} className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}>{children}</button>;
}