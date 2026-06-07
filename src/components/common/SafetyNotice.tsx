/**
 * Trust & safety reminder shown around the address-reveal / messaging flow.
 * Donow connects strangers, so set expectations explicitly.
 */
export function SafetyNotice({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 ${className}`}>
      <p className="mb-1 font-semibold">🛡️ Stay safe</p>
      <ul className="list-disc space-y-0.5 pl-5">
        <li>Meet in a public place when you can.</li>
        <li>Never send money or pay in advance.</li>
        <li>Report suspicious behaviour.</li>
        <li>Donow doesn’t verify every user — use your judgement.</li>
      </ul>
    </div>
  );
}
