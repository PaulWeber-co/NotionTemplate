/**
 * Seitengerüst: Navigationsleiste mit großem Titel, der beim Scrollen
 * in die kompakte Leiste zusammenfährt — wie in den iOS-System-Apps.
 */

import { h, clear, icon } from './ui.js';

export function page({ title, subtitle, right, left, sticky } = {}) {
  const navTitle = h('div', { class: 'navbar-title' }, title);
  const navbar = h('header', { class: 'navbar' },
    left || h('span', { style: { minWidth: '44px' } }),
    navTitle,
    right || h('span', { style: { minWidth: '44px' } }));

  const large = h('div', { class: 'large-title' },
    title,
    subtitle ? h('small', {}, subtitle) : null);

  const content = h('div', { class: 'page-content' });
  const scroll = h('div', { class: 'scroll' }, large, sticky || null, content);

  let pinned = false;
  scroll.addEventListener('scroll', () => {
    const next = scroll.scrollTop > 26;
    if (next !== pinned) {
      pinned = next;
      navbar.classList.toggle('pinned', next);
    }
  }, { passive: true });

  const root = h('div', { class: 'page' }, navbar, scroll);
  root.style.display = 'contents';

  return { root, navbar, scroll, content, setTitle: (t) => { navTitle.textContent = t; large.firstChild.textContent = t; } };
}

export function navButton(label, onclick, opts = {}) {
  return h('button', { class: 'navbar-btn', type: 'button', onclick, 'aria-label': opts.label || label },
    opts.icon ? icon(opts.icon, { weight: opts.weight || 2 }) : label);
}

/** Ersetzt den Inhalt eines Containers durch neue Knoten. */
export function fill(container, ...nodes) {
  clear(container);
  for (const n of nodes.flat(Infinity)) if (n) container.append(n);
  return container;
}
