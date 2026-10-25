// A tiny toast queue: one message at a time, newest wins.
import { create } from 'zustand';

type Toast = { id: number; text: string; tone: 'default' | 'good' | 'warn' };
export const useToast = create<{ current: Toast | null }>(() => ({ current: null }));

let n = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(text: string, tone: Toast['tone'] = 'default') {
  clearTimeout(timer);
  useToast.setState({ current: { id: ++n, text, tone } });
  timer = setTimeout(() => useToast.setState({ current: null }), 2600);
}

export const dismissToast = () => {
  clearTimeout(timer);
  useToast.setState({ current: null });
};
