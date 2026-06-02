export default function Loading() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Hero image background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1920&q=80"
        alt=""
        className="absolute inset-0 h-full w-full object-cover [object-position:right_20%] sm:[object-position:70%_25%]"
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-teal-900/80" />

      {/* Brand + spinner */}
      <div className="relative z-10 flex flex-col items-center gap-3 text-center px-4">
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm">
          <svg viewBox="0 0 32 32" className="h-10 w-10" xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              fill="white"
              d="M7 5L15 5C22 5 26 9 26 16C26 23 22 27 15 27L7 27ZM11 9L14 9C20 9 22 12 22 16C22 20 20 23 14 23L11 23Z"
            />
          </svg>
        </div>
        <p className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg">Donow</p>
        <p className="text-sm font-medium text-teal-200 tracking-wide">Donate · Help · Make Impact</p>
        <div className="mt-5 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-teal-400"
              style={{ animation: `bounce 1s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
