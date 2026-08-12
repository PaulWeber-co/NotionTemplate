/**
 * UI-Bausteine: DOM-Helfer, Icons, Sheets, Dialoge, Hinweise.
 * Bewusst klein gehalten — kein Framework, kein Build-Schritt.
 */

// ── DOM ──────────────────────────────────────────────────────────────────────

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

// ── Icons (24×24, currentColor, stroke-basiert) ──────────────────────────────

const ICONS = {
  today: 'M4 5h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM3 10h18M8 3v4M16 3v4',
  tasks: 'M4 7.5 6 9.5 10 5M4 16.5 6 18.5 10 14M13.5 7.5H20M13.5 17H20',
  calendar: 'M4 5h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM3 10h18M8 3v4M16 3v4M7.5 14h2M11 14h2M14.5 14h2M7.5 17h2M11 17h2',
  grades: 'M4 19V5a1 1 0 0 1 1-1h11l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1ZM15 4v5h5M8 13h8M8 16.5h5',
  more: 'M4 7h16M4 12h16M4 17h16',
  plus: 'M12 5v14M5 12h14',
  chevron: 'm9 5 7 7-7 7',
  chevronDown: 'm5 9 7 7 7-7',
  chevronLeft: 'm15 5-7 7 7 7',
  check: 'm5 12.5 4.5 4.5L19 7',
  close: 'M6 6l12 12M18 6 6 18',
  clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM12 7v5.5l3.5 2',
  flame: 'M12 3s5 4.2 5 8.4A5 5 0 0 1 7 11.4C7 9 8.5 7.6 8.5 7.6S9 10 10.4 10c1.3 0 1.6-1.6 1.6-3.2C12 5.4 12 3 12 3Z',
  book: 'M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5v-14ZM4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3',
  home: 'm3.5 11 8.5-7 8.5 7M6 9.5V20h12V9.5',
  case: 'M3.5 8h17a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1ZM9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8',
  trash: 'M4.5 7h15M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M6.5 7l.8 12.1a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9L17.5 7',
  edit: 'M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3ZM14.5 6.5l3 3',
  chart: 'M4 20V10M10 20V4M16 20v-7M4 20h16',
  target: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 11.2a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Z',
  gear: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM19.4 13a7.6 7.6 0 0 0 0-2l1.8-1.3-1.8-3.1-2.1.8a7.6 7.6 0 0 0-1.8-1L15.2 4h-3.6l-.3 2.3a7.6 7.6 0 0 0-1.8 1l-2.1-.8-1.8 3.1L7.4 11a7.6 7.6 0 0 0 0 2l-1.8 1.3 1.8 3.1 2.1-.8c.55.44 1.16.78 1.8 1l.3 2.3h3.6l.3-2.3c.64-.22 1.25-.56 1.8-1l2.1.8 1.8-3.1L19.4 13Z',
  download: 'M12 4v11m0 0 4-4m-4 4-4-4M4.5 19h15',
  upload: 'M12 20V9m0 0 4 4M12 9l-4 4M4.5 4h15',
  sun: 'M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9ZM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8',
  cloud: 'M7 18h10a3.5 3.5 0 0 0 .3-7A5.5 5.5 0 0 0 6.6 11 3.5 3.5 0 0 0 7 18Z',
  info: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM12 11v5.5M12 7.6v.8',
  warn: 'M12 4 2.8 20h18.4L12 4ZM12 10v4.5M12 17.2v.6',
  search: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13ZM15.5 15.5 20 20',
  play: 'M8 5.5v13l11-6.5-11-6.5Z',
  pause: 'M9 5.5v13M15 5.5v13',
  stop: 'M6.5 6.5h11v11h-11z',
  share: 'M12 3v12m0-12 4 4m-4-4-4 4M5 13v6.5a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V13',
  doc: 'M6 3.5h7l5 5V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5ZM13 3.5V9h5',
  refresh: 'M20 12a8 8 0 1 1-2.5-5.8M20 4v4.5h-4.5',
  flag: 'M6 21V4h12l-2.5 4L18 12H6',
  bulb: 'M9 17h6M10 20.5h4M12 3a6 6 0 0 1 3.6 10.8c-.6.5-.9 1-.9 1.7H9.3c0-.7-.3-1.2-.9-1.7A6 6 0 0 1 12 3Z',
};

export function icon(name, opts = {}) {
  const d = ICONS[name] || ICONS.info;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('icon');
  if (opts.class) svg.classList.add(...opts.class.split(' '));
  if (opts.size) {
    svg.style.width = `${opts.size}px`;
    svg.style.height = `${opts.size}px`;
  }
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', opts.weight || 1.8);
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  if (opts.fill) path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
}

// ── Listenbausteine im iOS-Stil ──────────────────────────────────────────────

export function group(title, ...rows) {
  const children = rows.flat(Infinity).filter(Boolean);
  return h('section', { class: 'group' },
    title ? h('h2', { class: 'group-title' }, title) : null,
    h('div', { class: 'list' }, ...children));
}

export function row(opts = {}) {
  const {
    title, subtitle, detail, leading, trailing, onclick, href, chevron, danger, tint, id, dataset,
  } = opts;
  const content = [
    leading ? h('div', { class: 'row-leading' }, leading) : null,
    h('div', { class: 'row-main' },
      h('div', { class: 'row-title' }, title),
      subtitle ? h('div', { class: 'row-sub' }, subtitle) : null),
    detail != null ? h('div', { class: 'row-detail' }, detail) : null,
    trailing || null,
    chevron ? icon('chevron', { class: 'row-chevron', weight: 2.2 }) : null,
  ];
  const cls = ['row', danger && 'row-danger', tint && 'row-tint', (onclick || href) && 'row-tap']
    .filter(Boolean).join(' ');
  if (href) return h('a', { class: cls, href, target: '_blank', rel: 'noopener', id, dataset }, ...content);
  return h('div', { class: cls, onclick, id, dataset, role: onclick ? 'button' : null, tabindex: onclick ? 0 : null }, ...content);
}

export function footnote(text) {
  return h('p', { class: 'group-foot' }, text);
}

export function emptyState({ symbol = 'info', title, text, action } = {}) {
  return h('div', { class: 'empty' },
    h('div', { class: 'empty-icon' }, icon(symbol, { size: 30, weight: 1.5 })),
    h('div', { class: 'empty-title' }, title),
    text ? h('p', { class: 'empty-text' }, text) : null,
    action || null);
}

export function button(label, opts = {}) {
  return h('button', {
    class: ['btn', opts.variant ? `btn-${opts.variant}` : 'btn-plain', opts.class].filter(Boolean).join(' '),
    type: opts.type || 'button',
    onclick: opts.onclick,
    disabled: opts.disabled,
  }, opts.icon ? icon(opts.icon, { size: 18 }) : null, label);
}

export function segmented(options, value, onChange) {
  const wrap = h('div', { class: 'segmented', role: 'tablist' });
  for (const opt of options) {
    wrap.append(h('button', {
      class: `seg${opt.value === value ? ' seg-on' : ''}`,
      type: 'button',
      role: 'tab',
      'aria-selected': opt.value === value ? 'true' : 'false',
      onclick: () => onChange(opt.value),
    }, opt.label));
  }
  return wrap;
}

// ── Sheets & Dialoge ─────────────────────────────────────────────────────────

let sheetStack = [];

/**
 * Modales Sheet im iOS-Stil. `render` bekommt Helfer zum Schließen.
 * Gibt eine Promise zurück, die mit dem Ergebnis von close(value) auflöst.
 */
export function sheet({ title, leftLabel = 'Abbrechen', rightLabel, onRight, render, size = 'auto' }) {
  return new Promise((resolve) => {
    const backdrop = h('div', { class: 'sheet-backdrop' });
    const body = h('div', { class: 'sheet-body' });

    const close = (value) => {
      panel.classList.add('sheet-out');
      backdrop.classList.add('backdrop-out');
      setTimeout(() => {
        wrap.remove();
        sheetStack = sheetStack.filter((s) => s !== wrap);
        if (!sheetStack.length) document.body.classList.remove('modal-open');
        resolve(value);
      }, 240);
    };

    const rightBtn = rightLabel
      ? h('button', {
        class: 'sheet-action sheet-action-strong',
        type: 'button',
        onclick: () => onRight?.(close),
      }, rightLabel)
      : h('span', { class: 'sheet-action-spacer' });

    const panel = h('div', { class: `sheet sheet-${size}` },
      h('div', { class: 'sheet-grabber' }),
      h('header', { class: 'sheet-bar' },
        h('button', { class: 'sheet-action', type: 'button', onclick: () => close(null) }, leftLabel),
        h('div', { class: 'sheet-title' }, title || ''),
        rightBtn),
      body);

    const wrap = h('div', { class: 'sheet-wrap' }, backdrop, panel);
    backdrop.addEventListener('click', () => close(null));
    document.body.append(wrap);
    document.body.classList.add('modal-open');
    sheetStack.push(wrap);

    render(body, close);
    requestAnimationFrame(() => panel.classList.add('sheet-in'));
  });
}

/** Bestätigungsdialog. Löst mit true/false auf. */
export function confirmDialog({ title, text, confirmLabel = 'Löschen', destructive = true }) {
  return new Promise((resolve) => {
    const close = (val) => {
      wrap.classList.add('alert-out');
      setTimeout(() => {
        wrap.remove();
        if (!sheetStack.length) document.body.classList.remove('modal-open');
        resolve(val);
      }, 180);
    };
    const wrap = h('div', { class: 'alert-wrap' },
      h('div', { class: 'alert-backdrop', onclick: () => close(false) }),
      h('div', { class: 'alert' },
        h('div', { class: 'alert-head' },
          h('div', { class: 'alert-title' }, title),
          text ? h('p', { class: 'alert-text' }, text) : null),
        h('div', { class: 'alert-actions' },
          h('button', { class: 'alert-btn', type: 'button', onclick: () => close(false) }, 'Abbrechen'),
          h('button', {
            class: `alert-btn alert-btn-strong${destructive ? ' alert-btn-danger' : ''}`,
            type: 'button',
            onclick: () => close(true),
          }, confirmLabel))));
    document.body.append(wrap);
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => wrap.classList.add('alert-in'));
  });
}

/** Aktionsliste von unten (iOS Action Sheet). Löst mit der gewählten id auf. */
export function actionSheet({ title, message, actions }) {
  return new Promise((resolve) => {
    const close = (val) => {
      wrap.classList.add('alert-out');
      setTimeout(() => {
        wrap.remove();
        if (!sheetStack.length) document.body.classList.remove('modal-open');
        resolve(val);
      }, 180);
    };
    const list = h('div', { class: 'as-list' },
      title || message
        ? h('div', { class: 'as-head' },
          title ? h('div', { class: 'as-title' }, title) : null,
          message ? h('div', { class: 'as-msg' }, message) : null)
        : null,
      ...actions.map((a) => h('button', {
        class: `as-btn${a.destructive ? ' as-danger' : ''}`,
        type: 'button',
        onclick: () => close(a.id),
      }, a.label)));

    const wrap = h('div', { class: 'as-wrap' },
      h('div', { class: 'alert-backdrop', onclick: () => close(null) }),
      h('div', { class: 'as-panel' },
        list,
        h('div', { class: 'as-list as-cancel' },
          h('button', { class: 'as-btn', type: 'button', onclick: () => close(null) }, 'Abbrechen'))));
    document.body.append(wrap);
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => wrap.classList.add('alert-in'));
  });
}

/** Kurze Rückmeldung am unteren Rand. */
let toastTimer = null;
export function toast(message, opts = {}) {
  let el = $('#toast');
  if (!el) {
    el = h('div', { class: 'toast', id: 'toast' });
    document.body.append(el);
  }
  clear(el);
  el.classList.toggle('toast-warn', !!opts.warn);
  el.append(icon(opts.warn ? 'warn' : 'check', { size: 17, weight: 2.2 }), h('span', {}, message));
  el.classList.add('toast-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('toast-on'), opts.duration || 2200);
}

// ── Formularfelder ───────────────────────────────────────────────────────────

export function field({ label, input, hint }) {
  return h('label', { class: 'field' },
    h('span', { class: 'field-label' }, label),
    input,
    hint ? h('span', { class: 'field-hint' }, hint) : null);
}

export function textInput(opts = {}) {
  return h('input', {
    class: 'input',
    type: opts.type || 'text',
    value: opts.value ?? '',
    placeholder: opts.placeholder || '',
    inputmode: opts.inputmode,
    min: opts.min,
    max: opts.max,
    step: opts.step,
    maxlength: opts.maxlength,
    oninput: opts.oninput,
    onchange: opts.onchange,
    enterkeyhint: opts.enterkeyhint,
  });
}

export function select(options, value, onChange, opts = {}) {
  const el = h('select', { class: 'input select', onchange: (e) => onChange(e.target.value) });
  if (opts.placeholder) {
    el.append(h('option', { value: '' }, opts.placeholder));
  }
  for (const o of options) {
    el.append(h('option', { value: String(o.value), selected: String(o.value) === String(value) }, o.label));
  }
  el.value = value == null ? '' : String(value);
  return el;
}

export function toggle(checked, onChange) {
  const input = h('input', {
    type: 'checkbox',
    checked,
    onchange: (e) => onChange(e.target.checked),
  });
  return h('label', { class: 'switch' }, input, h('span', { class: 'switch-track' }, h('span', { class: 'switch-knob' })));
}

/** Ringförmiger Fortschritt als SVG. */
export function progressRing(fraction, opts = {}) {
  const size = opts.size || 132;
  const stroke = opts.stroke || 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.classList.add('ring');
  svg.style.width = `${size}px`;
  svg.style.height = `${size}px`;
  const mk = (cls, dash) => {
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', size / 2);
    circle.setAttribute('cy', size / 2);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke-width', stroke);
    circle.setAttribute('stroke-linecap', 'round');
    circle.setAttribute('class', cls);
    if (dash != null) {
      circle.setAttribute('stroke-dasharray', `${dash} ${c}`);
      circle.setAttribute('transform', `rotate(-90 ${size / 2} ${size / 2})`);
      // Ohne Fortschritt würde die runde Kappe als Punkt stehen bleiben.
      if (dash < 0.5) circle.setAttribute('stroke-opacity', '0');
    }
    return circle;
  };
  svg.append(mk('ring-track'), mk('ring-fill', c * Math.max(0, Math.min(1, fraction))));
  return svg;
}

// ── Formatierung ─────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export { WEEKDAYS, WEEKDAYS_SHORT, MONTHS, MONTHS_SHORT };

export function formatDate(iso, style = 'medium') {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (style === 'short') return `${d}.${m}.`;
  if (style === 'long') return `${WEEKDAYS[date.getDay()]}, ${d}. ${MONTHS[m - 1]} ${y}`;
  if (style === 'weekday') return `${WEEKDAYS_SHORT[date.getDay()]}, ${d}. ${MONTHS_SHORT[m - 1]}`;
  return `${d}. ${MONTHS_SHORT[m - 1]} ${y}`;
}

/** „Heute", „Morgen", „vor 3 Tagen", sonst Datum. */
export function relativeDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((date - now) / 86400000);
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Morgen';
  if (diff === -1) return 'Gestern';
  if (diff > 1 && diff < 7) return WEEKDAYS[date.getDay()];
  if (diff < 0 && diff > -7) return `vor ${-diff} Tagen`;
  return formatDate(iso, 'medium');
}

export function pluralDays(n) {
  return n === 1 ? '1 Tag' : `${n} Tage`;
}
