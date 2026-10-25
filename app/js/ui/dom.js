// Tiny DOM helpers shared by the views.

// html`...` -> DocumentFragment. Interpolated values are inserted as text
// unless wrapped with raw().
export function raw(s) {
  return { __raw: String(s) };
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < vals.length) {
      const v = vals[i];
      if (v == null || v === false) return;
      if (Array.isArray(v)) out += v.map((x) => (x && x.__raw != null ? x.__raw : esc(x))).join('');
      else out += v.__raw != null ? v.__raw : esc(v);
    }
  });
  return out;
}

export function el(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function on(target, type, fn, opts) {
  target.addEventListener(type, fn, opts);
  return () => target.removeEventListener(type, fn, opts);
}

// Collects teardown functions for a view.
export class Scope {
  constructor() {
    this.fns = [];
  }
  add(fn) {
    this.fns.push(fn);
    return fn;
  }
  on(target, type, fn, opts) {
    return this.add(on(target, type, fn, opts));
  }
  timer(fn, ms) {
    const id = setInterval(fn, ms);
    this.add(() => clearInterval(id));
    return id;
  }
  later(fn, ms) {
    const id = setTimeout(fn, ms);
    this.add(() => clearTimeout(id));
    return id;
  }
  raf(fn) {
    let id = 0,
      alive = true;
    const loop = (t) => {
      if (!alive) return;
      fn(t);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    this.add(() => {
      alive = false;
      cancelAnimationFrame(id);
    });
  }
  dispose() {
    this.fns
      .splice(0)
      .reverse()
      .forEach((f) => {
        try {
          f();
        } catch (_) {
          /* ignore */
        }
      });
  }
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Persisted UI preferences (falls back silently when storage is blocked).
export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('gpclone.' + key);
      return v == null ? fallback : JSON.parse(v);
    } catch (_) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('gpclone.' + key, JSON.stringify(value));
    } catch (_) {
      /* ignore */
    }
  },
};
