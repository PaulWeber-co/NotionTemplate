/**
 * Aufgaben — Listen im Stil von Erinnerungen, mit Wischgesten und
 * optionaler Verknüpfung zu einem Modul oder Fach.
 */

import {
  h, icon, group, row, footnote, emptyState, button, segmented, sheet, confirmDialog,
  actionSheet, toast, field, textInput, select, relativeDate, formatDate,
} from '../ui.js';
import { page, navButton, fill } from '../page.js';
import * as S from '../store.js';

let filter = 'offen';

const LIST_COLORS = ['blue', 'green', 'orange', 'red', 'purple', 'teal', 'indigo', 'pink'];

export function listById(id) {
  return S.get().lists.find((l) => l.id === id) || S.get().lists[0];
}

export function openTasks() { filter = 'offen'; }

export function render(screen, ctx) {
  const st = S.get();
  const p = page({
    title: 'Aufgaben',
    right: navButton('', () => compose(null, ctx), { icon: 'plus', label: 'Neue Aufgabe', weight: 2.2 }),
    left: navButton('', () => manageLists(ctx), { icon: 'more', label: 'Listen verwalten' }),
  });
  fill(screen, p.root);

  const seg = segmented([
    { value: 'offen', label: 'Offen' },
    { value: 'heute', label: 'Heute' },
    { value: 'alle', label: 'Alle' },
    { value: 'erledigt', label: 'Erledigt' },
  ], filter, (v) => { filter = v; ctx.rerender(); });

  const tasks = filtered(st.tasks, filter);

  if (!tasks.length) {
    fill(p.content, seg, emptyState({
      symbol: 'tasks',
      title: filter === 'erledigt' ? 'Noch nichts erledigt' : 'Alles frei',
      text: filter === 'erledigt' ? 'Abgehakte Aufgaben landen hier.' : 'Keine offenen Aufgaben. Tipp auf +, um eine anzulegen.',
      action: filter !== 'erledigt' ? button('Aufgabe hinzufügen', { variant: 'tinted', onclick: () => compose(null, ctx) }) : null,
    }));
    return;
  }

  const buckets = bucketize(tasks, filter);
  fill(p.content, seg,
    ...buckets.map((b) => group(b.label, ...b.items.map((t) => taskRow(t, ctx)))),
    filter === 'erledigt'
      ? group('', row({
        title: 'Erledigte löschen',
        danger: true,
        leading: h('div', { class: 'tile tile-red' }, icon('trash')),
        onclick: async () => {
          const ok = await confirmDialog({ title: 'Erledigte Aufgaben löschen?', text: `${tasks.length} Einträge werden entfernt.` });
          if (!ok) return;
          S.update((s) => { s.tasks = s.tasks.filter((t) => !t.done); });
          ctx.rerender();
          toast('Aufgelöst');
        },
      }))
      : footnote('Nach links wischen zum Bearbeiten oder Löschen.'));
}

function filtered(tasks, mode) {
  const today = S.today();
  switch (mode) {
    case 'heute': return tasks.filter((t) => !t.done && t.due && t.due <= today);
    case 'erledigt': return tasks.filter((t) => t.done);
    case 'alle': return tasks.filter((t) => !t.done).concat(tasks.filter((t) => t.done));
    default: return tasks.filter((t) => !t.done);
  }
}

function bucketize(tasks, mode) {
  if (mode === 'erledigt') {
    const sorted = tasks.slice().sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
    return [{ label: 'Erledigt', items: sorted }];
  }
  const today = S.today();
  const defs = [
    { key: 'over', label: 'Überfällig', test: (t) => t.due && t.due < today },
    { key: 'today', label: 'Heute', test: (t) => t.due === today },
    { key: 'soon', label: 'Als Nächstes', test: (t) => t.due && t.due > today && S.daysUntil(t.due) <= 7 },
    { key: 'later', label: 'Später', test: (t) => t.due && S.daysUntil(t.due) > 7 },
    { key: 'none', label: 'Ohne Datum', test: (t) => !t.due },
    { key: 'done', label: 'Erledigt', test: (t) => t.done },
  ];
  const out = [];
  for (const d of defs) {
    const items = tasks.filter((t) => (d.key === 'done' ? t.done : !t.done && d.test(t)));
    if (!items.length) continue;
    items.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (b.prio || 0) - (a.prio || 0));
    out.push({ label: d.label, items });
  }
  return out;
}

function taskRow(task, ctx) {
  const list = listById(task.list);
  const overdue = !task.done && task.due && task.due < S.today();
  const linked = linkedLabel(task);

  const chips = h('div', { class: 'chips' },
    h('span', { class: 'chip chip-dot', style: { color: `var(--${list.color})` } }, list.name),
    task.due ? h('span', { class: `chip ${overdue ? 'chip-late' : 'chip-due'}` }, relativeDate(task.due) + (task.time ? `, ${task.time}` : '')) : null,
    task.prio ? h('span', { class: 'chip', style: { color: 'var(--orange)' } }, task.prio === 2 ? '!!' : '!') : null,
    linked ? h('span', { class: 'chip' }, linked) : null);

  const tick = h('button', {
    class: `tick${task.done ? ' tick-on' : ''}`,
    type: 'button',
    'aria-label': task.done ? 'Als offen markieren' : 'Als erledigt markieren',
    onclick: (e) => {
      e.stopPropagation();
      S.update(() => {
        task.done = !task.done;
        task.doneAt = task.done ? new Date().toISOString() : null;
      });
      ctx.rerender();
    },
  }, icon('check', { weight: 2.6 }));

  const surface = h('div', {
    class: `row task-row swipe-surface row-tap${task.done ? ' task-done' : ''}`,
    onclick: () => compose(task, ctx),
  },
    h('div', { class: 'row-leading' }, tick),
    h('div', { class: 'row-main' },
      h('div', { class: 'row-title' }, task.title),
      task.note ? h('div', { class: 'task-note' }, task.note) : null,
      chips));

  const wrap = h('div', { class: 'swipe' },
    h('div', { class: 'swipe-actions' },
      h('button', {
        class: 'swipe-action swipe-action-edit', type: 'button',
        onclick: () => compose(task, ctx),
      }, 'Ändern'),
      h('button', {
        class: 'swipe-action', type: 'button',
        onclick: () => {
          S.update((s) => { s.tasks = s.tasks.filter((t) => t.id !== task.id); });
          ctx.rerender();
          toast('Gelöscht');
        },
      }, 'Löschen')),
    surface);

  attachSwipe(surface);
  return wrap;
}

function linkedLabel(task) {
  if (!task.moduleId) return null;
  const found = S.findModule(task.moduleId);
  return found ? found.mod.name : null;
}

/** Horizontale Wischgeste: legt die Aktionen darunter frei. */
function attachSwipe(surface) {
  const WIDTH = 156;
  let startX = 0;
  let startY = 0;
  let dx = 0;
  let open = false;
  let locked = null;

  surface.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    locked = null;
    surface.style.transition = 'none';
  }, { passive: true });

  surface.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    const mx = t.clientX - startX;
    const my = t.clientY - startY;
    if (locked === null) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      locked = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
    }
    if (locked !== 'x') return;
    dx = Math.max(-WIDTH - 24, Math.min(0, (open ? -WIDTH : 0) + mx));
    surface.style.transform = `translateX(${dx}px)`;
  }, { passive: true });

  const settle = () => {
    if (locked !== 'x') return;
    surface.style.transition = '';
    open = dx < -WIDTH / 2;
    surface.style.transform = `translateX(${open ? -WIDTH : 0}px)`;
    locked = null;
  };
  surface.addEventListener('touchend', settle, { passive: true });
  surface.addEventListener('touchcancel', settle, { passive: true });

  // Klick verschlucken, solange die Aktionen offen liegen.
  surface.addEventListener('click', (e) => {
    if (open) {
      e.stopPropagation();
      e.preventDefault();
      open = false;
      surface.style.transform = '';
    }
  }, true);
}

// ── Anlegen / Bearbeiten ─────────────────────────────────────────────────────

export function compose(existing, ctx, defaults = {}) {
  const st = S.get();
  const isNew = !existing;
  const draft = existing
    ? { ...existing }
    : {
      title: '', note: '', due: defaults.due || null, time: null,
      list: st.lists[0]?.id || 'studium', prio: 0, moduleId: defaults.moduleId || null,
    };

  const moduleOptions = () => {
    const out = [{ value: '', label: 'Keine Verknüpfung' }];
    const uni = st.study.uni;
    if (uni) for (const sem of uni.semesters) for (const m of sem.modules) out.push({ value: m.id, label: `${sem.nr}. Sem · ${m.name}` });
    return out;
  };

  return sheet({
    title: isNew ? 'Neue Aufgabe' : 'Aufgabe',
    rightLabel: isNew ? 'Hinzufügen' : 'Sichern',
    size: 'full',
    onRight: (close) => {
      if (!draft.title.trim()) { toast('Titel fehlt', { warn: true }); return; }
      S.update((s) => {
        if (isNew) {
          s.tasks.push({
            id: S.uid('t_'),
            title: draft.title.trim(),
            note: draft.note.trim(),
            due: draft.due || null,
            time: draft.time || null,
            list: draft.list,
            prio: Number(draft.prio) || 0,
            moduleId: draft.moduleId || null,
            done: false,
            doneAt: null,
            createdAt: new Date().toISOString(),
          });
        } else {
          Object.assign(existing, {
            title: draft.title.trim(),
            note: draft.note.trim(),
            due: draft.due || null,
            time: draft.time || null,
            list: draft.list,
            prio: Number(draft.prio) || 0,
            moduleId: draft.moduleId || null,
          });
        }
      });
      ctx.rerender();
      close();
    },
    render: (body, close) => {
      const quickDate = (label, iso) => h('button', {
        class: 'chip', type: 'button',
        style: { padding: '7px 12px', fontSize: '14px' },
        onclick: (e) => {
          draft.due = iso;
          const input = body.querySelector('input[type="date"]');
          if (input) input.value = iso || '';
          e.currentTarget.blur();
        },
      }, label);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      fill(body,
        group('',
          field({ label: 'Aufgabe', input: textInput({ value: draft.title, placeholder: 'Was ist zu tun?', enterkeyhint: 'done', oninput: (e) => { draft.title = e.target.value; } }) }),
          h('label', { class: 'field' },
            h('span', { class: 'field-label' }, 'Notiz'),
            h('textarea', { class: 'input', placeholder: 'Optional', oninput: (e) => { draft.note = e.target.value; } }, draft.note))),

        group('Termin',
          field({ label: 'Fällig am', input: textInput({ type: 'date', value: draft.due || '', onchange: (e) => { draft.due = e.target.value || null; } }) }),
          h('div', { class: 'field', style: { display: 'flex', gap: '7px', flexWrap: 'wrap' } },
            quickDate('Heute', S.today()),
            quickDate('Morgen', S.isoDate(tomorrow)),
            quickDate('In einer Woche', S.isoDate(nextWeek)),
            quickDate('Kein Datum', null)),
          field({ label: 'Uhrzeit', input: textInput({ type: 'time', value: draft.time || '', onchange: (e) => { draft.time = e.target.value || null; } }) })),

        group('Einordnung',
          field({ label: 'Liste', input: select(st.lists.map((l) => ({ value: l.id, label: l.name })), draft.list, (v) => { draft.list = v; }) }),
          field({
            label: 'Priorität',
            input: select([{ value: 0, label: 'Ohne' }, { value: 1, label: 'Hoch (!)' }, { value: 2, label: 'Sehr hoch (!!)' }], draft.prio, (v) => { draft.prio = v; }),
          }),
          st.study.uni
            ? field({ label: 'Modul', input: select(moduleOptions(), draft.moduleId || '', (v) => { draft.moduleId = v || null; }) })
            : null),

        !isNew
          ? group('', row({
            title: 'Aufgabe löschen',
            danger: true,
            leading: h('div', { class: 'tile tile-red' }, icon('trash')),
            onclick: async () => {
              const ok = await confirmDialog({ title: 'Aufgabe löschen?' });
              if (!ok) return;
              S.update((s) => { s.tasks = s.tasks.filter((t) => t.id !== existing.id); });
              ctx.rerender();
              close();
            },
          }))
          : null);
    },
  });
}

// ── Listen ───────────────────────────────────────────────────────────────────

function manageLists(ctx) {
  return sheet({
    title: 'Listen',
    leftLabel: 'Fertig',
    size: 'full',
    render: (body) => {
      const draw = () => {
        const st = S.get();
        fill(body,
          group('Meine Listen',
            ...st.lists.map((l) => row({
              title: l.name,
              subtitle: `${st.tasks.filter((t) => t.list === l.id && !t.done).length} offen`,
              leading: h('span', { class: 'dot', style: { background: `var(--${l.color})`, width: '12px', height: '12px' } }),
              chevron: true,
              onclick: () => editList(l, ctx, draw),
            })),
            row({
              title: 'Liste hinzufügen',
              leading: h('div', { class: 'tile tile-tint' }, icon('plus', { weight: 2.4 })),
              tint: true,
              onclick: () => {
                const list = { id: S.uid('l_'), name: 'Neue Liste', color: LIST_COLORS[S.get().lists.length % LIST_COLORS.length], symbol: 'book' };
                S.update((s) => { s.lists.push(list); });
                editList(list, ctx, draw);
              },
            })),
          footnote('Aufgaben aus gelöschten Listen wandern in die erste Liste.'));
      };
      draw();
    },
  }).then(() => ctx.rerender());
}

function editList(list, ctx, redraw) {
  return sheet({
    title: 'Liste',
    leftLabel: 'Fertig',
    render: (body, close) => {
      fill(body,
        group('',
          field({ label: 'Name', input: textInput({ value: list.name, oninput: (e) => S.update(() => { list.name = e.target.value; }) }) }),
          h('div', { class: 'field' },
            h('span', { class: 'field-label' }, 'Farbe'),
            h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
              ...LIST_COLORS.map((c) => h('button', {
                type: 'button',
                'aria-label': c,
                style: {
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: `var(--${c})`,
                  boxShadow: list.color === c ? '0 0 0 3px var(--bg-raised), 0 0 0 5px var(--tint)' : 'none',
                },
                onclick: (e) => {
                  S.update(() => { list.color = c; });
                  redraw();
                  e.currentTarget.parentElement.querySelectorAll('button').forEach((b) => { b.style.boxShadow = 'none'; });
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--bg-raised), 0 0 0 5px var(--tint)';
                },
              }))))),
        S.get().lists.length > 1
          ? group('', row({
            title: 'Liste löschen',
            danger: true,
            leading: h('div', { class: 'tile tile-red' }, icon('trash')),
            onclick: async () => {
              const ok = await confirmDialog({ title: 'Liste löschen?', text: 'Die Aufgaben bleiben erhalten und wandern in die erste Liste.' });
              if (!ok) return;
              S.update((s) => {
                s.lists = s.lists.filter((l) => l.id !== list.id);
                const fallback = s.lists[0]?.id;
                for (const t of s.tasks) if (t.list === list.id) t.list = fallback;
              });
              redraw();
              ctx.rerender();
              close();
            },
          }))
          : null);
    },
  }).then(() => { redraw(); ctx.rerender(); });
}
