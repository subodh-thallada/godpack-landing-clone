// Formatting helpers.

export function money(v: number, { compact = false } = {}): string {
  const whole = compact && Math.abs(v - Math.round(v)) < 0.005;
  return (
    (v < 0 ? '−$' : '$') +
    Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 })
  );
}

export function ago(minutes: number): string {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const since = (t: number) => ago(Math.floor((Date.now() - t) / 60000));

export const round2 = (v: number) => Math.round(v * 100) / 100;

// Counts get thousands separators, and the right word for one versus many
// ("1 card", "1,284 cards").
export const num = (n: number) => n.toLocaleString('en-US');
export const plural = (n: number, one: string, many = `${one}s`) => `${num(n)} ${n === 1 ? one : many}`;

export function clock(ms: number): string {
  const left = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}
