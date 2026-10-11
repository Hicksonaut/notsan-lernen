# NotSan Lernen

Einfache Lern-Apps zum Abdecken und Abfragen für die Ausbildung im Rettungsdienst (Hessen).

- `index.html` – Startseite
- `algorithmen.html` – Basis- und K-Algorithmen abdecken
- `p-algorithmen.html` – P-Algorithmen (Maßnahmen und Verfahren) abdecken
- `medikamente.html` – Medikamente abdecken

Reine statische Dateien, kein Build nötig. Gehostet über GitHub Pages.

## Offline-Nutzung

`sw.js` ist ein Service Worker. Er cached das Grundgerüst sofort, die Bilder auf Wunsch über
die Zeile „Offline nutzen“ auf der Startseite. `sw.js` wird erzeugt, nicht von Hand bearbeitet:

```
python3 tools/build-sw.py
```

Nach jeder Änderung an HTML-Dateien oder Bildern ausführen und `sw.js` mit committen.
