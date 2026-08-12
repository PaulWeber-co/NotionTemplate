/** Ein Impuls pro Tag — bewusst kurz, damit er nicht zum Hintergrundrauschen wird. */

export const QUOTES = [
  { text: 'Der beste Zeitpunkt anzufangen war gestern. Der zweitbeste ist jetzt.', author: 'Sprichwort' },
  { text: 'Es ist nicht wenig Zeit, die wir haben, sondern viel Zeit, die wir nicht nutzen.', author: 'Seneca' },
  { text: 'Disziplin ist die Brücke zwischen Zielen und Ergebnissen.', author: 'Jim Rohn' },
  { text: 'Du musst nicht großartig sein, um anzufangen. Aber du musst anfangen, um großartig zu werden.', author: 'Zig Ziglar' },
  { text: 'Fokussiere dich nicht auf das Ergebnis, sondern auf den Prozess.', author: 'Nick Saban' },
  { text: 'Produktiv sein heißt nicht beschäftigt sein, sondern fertig werden.', author: 'Unbekannt' },
  { text: 'Kleine Schritte schlagen große Pläne.', author: 'Unbekannt' },
  { text: 'Perfektion ist der Feind des Fortschritts.', author: 'Sprichwort' },
  { text: 'Erfolg ist die Summe kleiner Anstrengungen, Tag für Tag wiederholt.', author: 'Robert Collier' },
  { text: 'Der Unterschied zwischen Erfolg und Misserfolg ist meistens: anfangen.', author: 'Unbekannt' },
  { text: 'Was immer du tun kannst oder erträumst — fange damit an.', author: 'nach Goethe' },
  { text: 'Zwischen Reiz und Reaktion liegt ein Raum. In diesem Raum liegt unsere Freiheit.', author: 'Viktor Frankl' },
  { text: 'Das Geheimnis des Vorwärtskommens ist der Anfang.', author: 'Mark Twain' },
  { text: 'Nicht weil es schwer ist, wagen wir es nicht — weil wir es nicht wagen, ist es schwer.', author: 'Seneca' },
  { text: 'Fortschritt, nicht Perfektion.', author: 'Unbekannt' },
  { text: 'Jeder Fachmann war einmal Anfänger.', author: 'Helen Hayes' },
  { text: 'Tu weniger. Dafür besser.', author: 'Greg McKeown' },
  { text: 'Ablenkung ist die teuerste Steuer auf Produktivität.', author: 'Robin Sharma' },
  { text: 'Wer den Hafen nicht kennt, für den ist kein Wind der richtige.', author: 'Seneca' },
  { text: 'Eine Stunde konzentriert schlägt vier Stunden halbherzig.', author: 'Unbekannt' },
  { text: 'Deine Gewohnheiten entscheiden, nicht deine Vorsätze.', author: 'Jack Canfield' },
  { text: 'Energie ist die eigentliche Währung der Leistung, nicht Zeit.', author: 'Jim Loehr' },
  { text: 'Manchmal wird aus „später“ einfach „nie“.', author: 'Unbekannt' },
  { text: 'Motivation bringt dich in Gang, Gewohnheit bringt dich ans Ziel.', author: 'Jim Ryun' },
  { text: 'Der Weg entsteht beim Gehen.', author: 'Antonio Machado' },
  { text: 'Wenn du keine Zeit dafür hast, hast du keine Priorität dafür.', author: 'Unbekannt' },
  { text: 'Lernen ist wie Rudern gegen den Strom.', author: 'Sprichwort' },
  { text: 'Zwei Wochen im Labor sparen zwei Stunden in der Bibliothek.', author: 'Westheimers Regel' },
  { text: 'Fang mit dem an, was dir am meisten Angst macht. Danach ist der Tag leicht.', author: 'Unbekannt' },
  { text: 'Wiederholung ist die Mutter des Lernens — Abstand ihr Vater.', author: 'Lernpsychologie' },
  { text: 'Man versteht erst, was man erklären kann.', author: 'nach Feynman' },
];

/** Immer derselbe Impuls an einem Tag — er soll nicht bei jedem Öffnen springen. */
export function quoteOfTheDay(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date - start) / 86400000);
  return QUOTES[day % QUOTES.length];
}
