'use client';

import { useEffect, useState } from 'react';

const KEY = 'donow_welcomed';

const POINTS: [string, string, string][] = [
  ['🎁', 'Donate what you don’t need', 'Post items in minutes — for people nearby who need them.'],
  ['🤝', 'Connect safely', 'Chat in-app first; your exact address stays private until you connect.'],
  ['❤️', 'Help people in need', 'Hand over in person and build trust with reviews. No money involved.'],
];

/** First-visit welcome shown once per browser (localStorage-gated). */
export function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* storage blocked — just don't show it */
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 text-center shadow-xl">
        <h2 className="text-2xl font-bold text-teal-700">Welcome to Donow 👋</h2>
        <p className="mt-1 text-sm text-gray-500">Give and receive, safely.</p>

        <div className="mt-5 space-y-4 text-left">
          {POINTS.map(([emoji, title, body]) => (
            <div key={title} className="flex gap-3">
              <span className="text-2xl">{emoji}</span>
              <div>
                <p className="font-semibold text-gray-900">{title}</p>
                <p className="text-sm text-gray-500">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={dismiss}
          className="mt-6 w-full rounded-lg bg-teal-600 px-4 py-2.5 font-semibold text-white hover:bg-teal-700"
        >
          Get Started
        </button>
        <button onClick={dismiss} className="mt-2 text-xs text-gray-400 hover:underline">
          Skip
        </button>
      </div>
    </div>
  );
}
