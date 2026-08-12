/**
 * iCalendar-Import und -Export.
 *
 * Import läuft rein lokal über eine hochgeladene .ics-Datei. Ein Abo per URL
 * ist auf GitHub Pages nicht möglich: Apple, Google und Outlook liefern ihre
 * Kalender-Feeds ohne CORS-Freigabe aus, ein Browser darf sie also gar nicht
 * lesen. Der Export erzeugt dafür eine .ics, die sich auf dem iPhone direkt in
 * die Kalender-App übernehmen lässt.
 */

/** Entfaltet gefaltete Zeilen (RFC 5545: Fortsetzung beginnt mit Space/Tab). */
function unfold(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '');
}

function unescapeText(v) {
  return v
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseLine(line) {
  const idx = line.indexOf(':');
  if (idx < 0) return null;
  const left = line.slice(0, idx);
  const value = line.slice(idx + 1);
  const [name, ...paramParts] = left.split(';');
  const params = {};
  for (const p of paramParts) {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value };
}

/** Wandelt DTSTART/DTEND in { date: 'YYYY-MM-DD', time: 'HH:MM' | null }. */
function parseDateValue(value, params) {
  const raw = value.trim();
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, , z] = m;
  if (!hh) return { date: `${y}-${mo}-${d}`, time: null, allDay: true };
  if (z) {
    // UTC in lokale Zeit umrechnen.
    const utc = new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm));
    const pad = (n) => String(n).padStart(2, '0');
    return {
      date: `${utc.getFullYear()}-${pad(utc.getMonth() + 1)}-${pad(utc.getDate())}`,
      time: `${pad(utc.getHours())}:${pad(utc.getMinutes())}`,
      allDay: false,
    };
  }
  // Ohne Z: als lokale Zeit lesen. TZID wird bewusst nicht umgerechnet —
  // dafür bräuchte es die vollständige Zeitzonendatenbank.
  return { date: `${y}-${mo}-${d}`, time: `${hh}:${mm}`, allDay: false, tzid: params.TZID || null };
}

/** Liest eine .ics-Datei und gibt Termine zurück. */
export function parseICS(text) {
  const lines = unfold(text).split('\n');
  const events = [];
  let current = null;
  let inAlarm = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'BEGIN:VEVENT') { current = {}; inAlarm = false; continue; }
    if (trimmed === 'END:VEVENT') {
      if (current && current.title && current.date) events.push(current);
      current = null;
      continue;
    }
    // Erinnerungen führen eigene SUMMARY/DESCRIPTION — die gehören nicht zum Termin.
    if (trimmed === 'BEGIN:VALARM') { inAlarm = true; continue; }
    if (trimmed === 'END:VALARM') { inAlarm = false; continue; }
    if (!current || inAlarm) continue;

    const parsed = parseLine(trimmed);
    if (!parsed) continue;
    const { name, params, value } = parsed;

    if (name === 'SUMMARY') current.title = unescapeText(value).trim();
    else if (name === 'DESCRIPTION') current.note = unescapeText(value).trim();
    else if (name === 'LOCATION') current.location = unescapeText(value).trim();
    else if (name === 'UID') current.uid = value.trim();
    else if (name === 'DTSTART') {
      const d = parseDateValue(value, params);
      if (d) { current.date = d.date; current.time = d.time; current.allDay = d.allDay; }
    } else if (name === 'DTEND') {
      const d = parseDateValue(value, params);
      if (d) { current.endDate = d.date; current.endTime = d.time; }
    } else if (name === 'RRULE') current.rrule = value.trim();
  }

  return events;
}

// ── Export ───────────────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0');

function stamp(d = new Date()) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function esc(v) {
  return String(v ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Faltet Zeilen auf 75 Oktetts, wie es der Standard verlangt. */
function fold(line) {
  if (line.length <= 73) return line;
  const out = [];
  let rest = line;
  out.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 72) {
    out.push(' ' + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  if (rest) out.push(' ' + rest);
  return out.join('\r\n');
}

function localStamp(date, time) {
  const [y, m, d] = date.split('-');
  if (!time) return { key: ';VALUE=DATE', value: `${y}${m}${d}` };
  const [hh, mm] = time.split(':');
  return { key: '', value: `${y}${m}${d}T${hh}${mm}00` };
}

function addMinutes(date, time, minutes) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '00:00').split(':').map(Number);
  const dt = new Date(y, m - 1, d, hh, mm + minutes);
  return {
    date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
    time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
  };
}

/**
 * Baut eine .ics aus Einträgen der Form
 * { id, title, date, time, note, location, durationMinutes }.
 */
export function buildICS(entries, calendarName = 'Anti Procrastinator') {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Anti Procrastinator//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calendarName)}`,
  ];

  for (const e of entries) {
    if (!e.date) continue;
    const start = localStamp(e.date, e.time);
    const dur = e.durationMinutes || 90;
    const end = e.time
      ? localStamp(...Object.values(addMinutes(e.date, e.time, dur)))
      : { key: ';VALUE=DATE', value: localStamp(addMinutes(e.date, '00:00', 1440).date, null).value };

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${esc(e.id || Math.random().toString(36).slice(2))}@anti-procrastinator`);
    lines.push(`DTSTAMP:${stamp()}`);
    lines.push(`DTSTART${start.key}:${start.value}`);
    lines.push(`DTEND${end.key}:${end.value}`);
    lines.push(fold(`SUMMARY:${esc(e.title)}`));
    if (e.note) lines.push(fold(`DESCRIPTION:${esc(e.note)}`));
    if (e.location) lines.push(fold(`LOCATION:${esc(e.location)}`));
    if (e.alarmMinutes) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER:-PT${e.alarmMinutes}M`, fold(`DESCRIPTION:${esc(e.title)}`), 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/** Startet einen Download. Auf dem iPhone öffnet .ics direkt die Kalender-App. */
export function download(filename, content, type = 'text/calendar;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 4000);
}

/** Öffnet den Dateiwähler und liefert den Textinhalt. */
export function pickFile(accept = '.ics') {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); input.remove(); return; }
      const reader = new FileReader();
      reader.onload = () => { resolve({ name: file.name, text: String(reader.result || '') }); input.remove(); };
      reader.onerror = () => { resolve(null); input.remove(); };
      reader.readAsText(file);
    });
    document.body.append(input);
    input.click();
  });
}
