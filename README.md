# Anti Procrastinator

Notentracker, Prüfungstermine, Aufgaben und Fokuszeit — eine Web-App, die auf dem
iPhone wie eine System-App aussieht und sich auch so anfühlt. Läuft als statische
Seite auf GitHub Pages, speichert alles lokal im Browser und braucht weder Konto
noch Server noch Netz.

**→ [App öffnen](https://paulweber-co.github.io/Anti-Procrastinator/)**

Auf dem iPhone: in Safari öffnen → Teilen → **Zum Home-Bildschirm**. Danach startet
sie im Vollbild ohne Browser-Leisten und der Speicher bleibt zuverlässig erhalten.

---

## Der Notentracker

Der Kern der App. Zwei Systeme, beide am deutschen Bildungswesen ausgerichtet.

### Studium

Vorgefüllt ist der Studiengang **Informatik Telekom B.Sc.** der Provadis School of
International Management and Technology — 1:1 aus dem Modulhandbuch v2.1 (gültig ab
Wintersemester 2024) übernommen:

- alle 6 Semester mit je 30 ECTS, 180 ECTS gesamt
- 30 Module mit ECTS, Prüfungsform, Modulverantwortung, Sprache, Angebotsrhythmus
- die 5 WAB-Module sind als solche markiert
- beide Wahlpflichtfächer mit je drei Alternativen zur Auswahl
- das Modulhandbuch liegt als PDF bei und ist aus jedem Modul heraus verlinkt

Eintragen muss man nur noch die **Prüfungsleistungen**. Alles andere rechnet die App:

| | |
|---|---|
| **Modulnote** | gewichtetes Mittel der Teilleistungen. Lerntechniken zählt z. B. Klausur 70 % und Gruppenpräsentation 30 % — genau wie im Modulhandbuch. |
| **Endnote** | ECTS-gewichteter Durchschnitt aller vollständig benoteten Module („Stellenwert der Note für die Endnote: Gewichtung entsprechend der ECTS") |
| **Zwischenstand** | ist erst eine von zwei Teilleistungen bewertet, zeigt die App die Note als vorläufig an und sagt, wie viel Prozent der Prüfung noch offen ist |
| **Rundung** | abschneiden auf eine Nachkommastelle (Hochschul-Standard), kaufmännisch oder zwei Stellen — umstellbar |
| **Prognose** | „Ich will 2,0 — was brauche ich noch?" Rechnet auf ECTS-Basis und sagt, wenn ein Ziel rechnerisch nicht mehr erreichbar oder schon sicher ist |

Wo das Modulhandbuch die Gewichtung offenlässt — bei den WAB-Modulen und bei
Business English — steht eine gleichmäßige Aufteilung als Annahme drin. Die App
weist im Modul ausdrücklich darauf hin; die Gewichtung ist überall editierbar.

Jedes Modul lässt sich umbenennen, in ECTS ändern, ausnehmen (`zählt nicht in den
Schnitt`) oder als anerkannt markieren. Neue Module und Teilleistungen kann man
jederzeit hinzufügen — auch für einen ganz anderen Studiengang, dafür gibt es die
leeren Bachelor- und Master-Vorlagen.

### Schule

- **Sekundarstufe I** (Klasse 5–10): Noten 1–6 mit Tendenzen (1+, 1, 1−, 2+ …)
- **Oberstufe** (Klasse 11–13): Punkte 15–0, inklusive Umrechnung in die Notenskala

Innerhalb eines Fachs werden schriftliche und sonstige Leistungen **erst je für sich
gemittelt und dann gewichtet** — eine zusätzliche mündliche Note kippt den Schnitt so
nicht überproportional. Drei Gewichtungsprofile stehen zur Wahl (Hauptfach 2:1,
Nebenfach 1:1, Fächer ohne Klassenarbeiten 100 % Mitarbeit), pro Fach umstellbar.
Einzelne Leistungen können zusätzlich doppelt oder halb zählen.

---

## Was die App sonst kann

**Heute** — die nächste Prüfung als Countdown, was heute fällig ist, der laufende
Fokus-Timer, Termine, optional Wetter und ein Impuls.

**Aufgaben** — Listen mit Farben, Fälligkeit, Uhrzeit, Priorität und optionaler
Verknüpfung zu einem Modul. Nach links wischen zum Bearbeiten oder Löschen.

**Kalender** — Monatsraster mit farbigen Markierungen: rot für Prüfungen, blau für
Aufgaben, grün für eigene Termine. Prüfungstermine kommen automatisch aus den Noten,
werden also nie doppelt gepflegt. `.ics`-Dateien lassen sich importieren, und der
Export erzeugt eine `.ics`, die das iPhone direkt in die Kalender-App übernimmt —
inklusive Erinnerung 24 Stunden vorher.

**Fokus** — Pomodoro mit einstellbaren Längen. Der Timer rechnet mit Zeitstempeln
statt mit einem Zähler und läuft deshalb korrekt weiter, wenn iOS die Seite im
Hintergrund einfriert oder das Display ausgeht.

**Statistik** — Fokusminuten und erledigte Aufgaben der letzten 14 Tage,
Semesterfortschritt, Notenverlauf.

**Einstellungen** — hell/dunkel/automatisch, acht Akzentfarben, Wochenbeginn,
Rundungsmodus, Sicherung als JSON exportieren und einspielen.

---

## Was bewusst fehlt

- **Kalender-Abo per URL.** Apple, Google und Outlook liefern ihre `.ics`-Feeds ohne
  CORS-Freigabe aus. Eine reine Browser-App darf sie gar nicht lesen — das ginge nur
  über einen fremden Proxy, durch den alle Termine liefen. Stattdessen: Datei-Import
  und Export.
- **Uhr-Widget.** Ein Telefon hat eine Uhr.
- **Verschiebbare Widgets.** Auf einem Handybildschirm ist die Reihenfolge ohnehin
  vorgegeben; das Ziehen stand dem Scrollen nur im Weg.
- **Chrome-Extension und native Wrapper.** Die installierbare PWA ersetzt beides,
  und drei Codebasen für dieselbe App laufen unweigerlich auseinander. Die alten
  Stände liegen weiterhin in der Git-Historie.

## Datenschutz

Alles liegt im `localStorage` dieses einen Browsers. Es gibt keinen Server, keine
Anmeldung, kein Tracking. Nach außen geht nur, was du selbst anstößt: die
Wetterabfrage bei Open-Meteo (ohne Schlüssel, mit deinen Koordinaten) — und nur,
wenn du das Wetter einschaltest.

Safari räumt den Speicher von Webseiten auf, die sieben Tage nicht benutzt wurden.
Als App auf dem Home-Bildschirm passiert das nicht. Die App weist darauf hin und
bietet unter **Mehr → Daten** eine Sicherung als JSON an.

## Technik

Kein Build-Schritt, keine Abhängigkeiten. HTML, CSS und ES-Module, so wie sie sind.

```
index.html              App-Hülle
manifest.webmanifest    PWA-Manifest
sw.js                   Service Worker (offline)
css/app.css             Design-System
js/
  app.js                Tabs, Thema, Start
  store.js              Zustand, Persistenz, Vorlagen-Aufbau
  grades.js             Notenskalen und Berechnungen
  focus.js              Pomodoro
  ics.js                iCalendar lesen und schreiben
  weather.js            Open-Meteo
  ui.js  page.js        DOM-Bausteine, Listen, Sheets, Seitengerüst
  data/curriculum.js    Provadis-Modulhandbuch als Daten
  data/school.js        Fächerkataloge und Gewichtungsprofile
  views/                Heute · Aufgaben · Kalender · Noten · Mehr · Einrichtung
assets/                 Icons und das Modulhandbuch als PDF
```

### Lokal starten

ES-Module brauchen HTTP, ein Doppelklick auf `index.html` reicht nicht:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

### Auf GitHub Pages veröffentlichen

Settings → Pages → Source: **Deploy from a branch** → Branch `main`, Ordner `/ (root)`.
Die `.nojekyll`-Datei sorgt dafür, dass GitHub die Dateien unverändert ausliefert.
