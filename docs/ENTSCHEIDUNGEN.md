# Entscheidungen – Fallahkalender

| Datum | Entscheidung | Begründung |
|-------|--------------|------------|
| 08.11.2026 | Web-App statt nativer Handy-App | Ein Code für Handy, Tablet und PC; als PWA aufs Handy legbar und offline nutzbar; kein App-Store nötig. (Nutzer: „ja“) |
| 08.11.2026 | Region Marokko zuerst, 5 Klimazonen, 15 einjährige Kulturen | Vom Nutzer festgelegt; Kulturen von Claude gewählt, später ausbaubar. |
| 08.11.2026 | Kein Framework, reines HTML/CSS/JS | Einfachste robuste Lösung, keine Abhängigkeiten, schneller Start, leicht wartbar. |
| 08.11.2026 | Fachdaten als JSON-Dateien | Kulturen/Krankheiten/Zonen ohne Code-Änderung erweiterbar. |
| 08.11.2026 | Speicherung nur auf dem Gerät | Keine Server-/Cloudkosten, Datenschutz, offline. |
| 08.11.2026 | Krankheitserkennung zuerst regelbasiert über Symptome | Funktioniert offline und ohne Kosten; KI kommt als Ergänzung. |
| 08.11.2026 | Bild-KI lokal auf eigenem Server (Ollama + Bildmodell) | Wunsch des Nutzers: keine Kosten pro Analyse, Fotos bleiben beim Nutzer. Zuerst kostenlos auf dem Mac testen, GPU-Server (Hetzner GEX44, ca. 184 €/Monat) erst bei echten Nutzern. |
| 08.11.2026 | Tests: Node-Testlauf (eingebaut) + Playwright-Screenshots | Keine zusätzlichen Pakete im Projekt nötig. |
| 08.11.2026 | Fellah- und Anwāʾ-Kalender als Zusatzanzeige im Kalender | Wunsch des Nutzers; verbindet Planung nach Messwerten mit dem vertrauten Bauernwissen. Überlieferung wird als solche gekennzeichnet, Daten in eigener JSON-Datei für regionale Varianten. |
| 08.11.2026 | Nur halal und zinsfrei | Vorgabe des Nutzers: keine Banken (auch keine partizipativen, da sie selbst Zinsen an Mutterbanken zahlen), keine Kredite, keine Versicherungen inkl. Takaful. Nur Zuschüsse, kostenlose Dienste, Kooperativen. Automatischer Test sucht nach ausgeschlossenen Anbietern. |
| 08.11.2026 | Förderdaten mit Quelle, Stand und Prüfmarke | Sätze und Nummern ändern sich; ungeprüfte Angaben werden in der App als „bitte prüfen“ markiert, Telefonnummern nur mit Quelle. |
| 08.11.2026 | Maßnahmen als Katalog je Problem, sortiert nach Aufwand 1–4 | Einfach erweiterbar, eine Liste bedient alle 15 Kulturen; Förderhinweis verlinkt direkt in die Hilfe-Ansicht. |
| 08.11.2026 | Krankheitshilfe als Punktwertung über Symptome, Freitext-Stichwörter, Wetter und Felddaten | Läuft offline, nachvollziehbar, Ergebnis mit Begründung; die eigene Bild-KI (MS5) kommt als weitere Stimme dazu. |
| 08.11.2026 | Chemische Mittel nur als Wirkstoff mit typischer Wartezeit, nie als Markenprodukt | Zulassungen ändern sich; verbindlich bleibt das Etikett des ONSSA-zugelassenen Mittels. Biologische Mittel stehen immer zuerst. |
| 08.11.2026 | Fotos verkleinert (max. 480 px) im Browser speichern | Bleiben auf dem Gerät, passen in den Speicher, reichen zum Vergleich bei Nachkontrollen. |
| 08.11.2026 | Keine deutsche Oberfläche; Sprachen Arabisch (Standard), Französisch, Darija, Tamazight | Auftrag des Nutzers („deutsche Version komplett weg“, „und amazighia“). Die Dokumente bleiben deutsch. |
| 08.11.2026 | Darija in arabischer Schrift, Tamazight (Zentralatlas) in Tifinagh | Antworten des Nutzers („1. ja 2. Tamazight (Atlas)“). Tifinagh ist die amtliche Schrift (IRCAM). |
| 08.11.2026 | Texte in Sprachdateien `code/src/sprachen/<code>.json` (Oberfläche + Überlagerung der Fachdaten) | Fachdaten bleiben eine Quelle; jede Sprache legt nur ihre Texte darüber. Darija und Tamazight bauen auf Arabisch auf: Fehlendes erscheint arabisch statt deutsch. Ein Test prüft Vollständigkeit, kein Deutsch, keine Ziffern ٠–٩ und halal/zinsfrei in allen Sprachen. |
| 08.11.2026 | Vorlesen jetzt über die Gerätestimme, später eigene Server-Stimmen | Antwort des Nutzers „3. A“: Stimme vom eigenen Server (wie die Bild-KI), zuerst kostenlos auf dem Mac testen. Bis dahin liest das Handy Arabisch und Französisch; Darija mit arabischer Stimme, Tamazight noch ohne Knopf. |
| 08.11.2026 | Der Nutzer prüft die Übersetzungen | Antwort des Nutzers „4. ich“. |
| 08.11.2026 | Offline über Service Worker mit „aus dem Speicher, im Hintergrund neu laden“ | Startet sofort und ohne Netz; Änderungen kommen ohne Zutun beim nächsten Öffnen an. Kein Build-Schritt nötig. |
| 08.11.2026 | Mehrere Felder als eigene Schlüssel je Feld (`fallahkalender.<id>.feld/plan/befall/tagebuch`) plus Liste `fallahkalender.felder` | Feldwechsel lädt die Seite neu, dadurch bleibt der übrige Code unverändert. Daten aus Version 3 werden beim ersten Start ins erste Feld übernommen. |
| 08.11.2026 | Sicherung als JSON-Datei mit allen `fallahkalender.*`-Einträgen, Wiederherstellen erst nach Rückfrage | Kein Konto und kein Server nötig; Daten bleiben beim Nutzer. |
| 08.11.2026 | Eigener Server in reinem Python (ohne Pakete) für App, Bild-KI und Stimmen | Läuft auf dem Mac und später auf jedem gemieteten Server gleich; Bild-KI über Ollama, Stimmen über austauschbaren Befehl in `stimmen.json`. Ohne Server läuft die App unverändert weiter. |
| 08.11.2026 | KI-Ergebnis nur als zusätzliche Stimme, nie allein | Test zeigte Fehler (Kraut- und Knollenfäule nicht erkannt); die Symptom-Wertung bleibt Grundlage, die KI ergänzt Anzeichen und zeigt ihre Sicherheit. |
| 08.11.2026 | Stimmen MMS/VITS trotz CC BY-NC | Einzige brauchbare freie Stimmen für Darija und Tamazight; reicht für Test und nicht-kommerziellen Einsatz. Vor einem Verkauf ersetzen. |
| 08.11.2026 | Bilder vor Text: Bildzeichen und freie Fotos überall | Auftrag des Nutzers („das visuelle ist mehr wert als lesen dann kommt hören dann lesen“). Nur Fotos mit freier Lizenz (Wikimedia Commons), Nachweis in der App; wo kein passendes Foto, ein gezeichnetes Bildzeichen. |
