'use client';

interface StarRatingProps {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'text-base', md: 'text-xl', lg: 'text-2xl' };

export function StarRating({ value, max = 5, onChange, size = 'md' }: StarRatingProps) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          disabled={!onChange}
          className={`${sizes[size]} leading-none transition-transform disabled:cursor-default ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        >
          <span className={star <= value ? 'text-yellow-400' : 'text-gray-300'}>★</span>
        </button>
      ))}
    </div>
  );
}
