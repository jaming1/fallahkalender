# Lastenheft – Fallahkalender
Version: 1.0   ·   Status: ✅ freigegeben   ·   Datum: 08.11.2026

## Versionsverlauf
| Version | Datum | Änderung | Status |
|---------|-------|----------|--------|
| 0.1 | 08.11.2026 | Erster Entwurf aus Idee v1.0 | Entwurf |
| 0.2 | 08.11.2026 | Bilderkennung über eigene lokale KI auf dem Server des Nutzers statt Cloud-API | Entwurf |
| 1.0 | 08.11.2026 | Hinweis zu Server-Kosten ergänzt, freigegeben | ✅ |

---

## 1. Ziel und Abgrenzung
**Ziel:** Eine Web-App für marokkanische Landwirte, die aus Wasser-, Boden-, Lage- und Felddaten passende Kulturen empfiehlt, eine Anbauanleitung und einen Dünge-/Arbeitskalender bis zur Ernte erstellt und bei Krankheiten/Schädlingen Ursachen, Maßnahmen und Kontrolltermine liefert.

**Abgrenzung (nicht Teil):** Marktplatz, Buchhaltung, Förderanträge, Sensoren/IoT, Drohnen, eigenes KI-Training, Nutzerkonten mit Server (erste Version speichert nur auf dem Gerät).

## 2. Muss-Anforderungen

| Nr | Anforderung |
|----|-------------|
| M1 | **Feld anlegen:** Name, Fläche (ha oder m²), Standort (Region aus Liste + optional GPS). |
| M2 | **Wasser erfassen:** pH-Wert, Salzgehalt (EC in dS/m, optional), Wasserleistung (m³/Tag), Bewässerungsart (Tropf, Furche, Beregnung, nur Regen). |
| M3 | **Boden erfassen:** pH, Bodenart (sandig/lehmig/tonig), Humus %, N, P, K (je als Messwert oder einfache Stufe niedrig/mittel/hoch), Kalk und Salz optional. |
| M4 | **Vorgeschichte erfassen:** Kulturen der letzten 3 Jahre und bekannte Probleme (Krankheiten, Schädlinge, schlechter Ertrag). |
| M5 | **Anbauempfehlung:** Bewertung aller Kulturen der Datenbank (sehr gut / gut / eingeschränkt / ungeeignet) mit Begründung in einfacher Sprache und „Warum nicht?“ bei ungeeigneten. |
| M6 | Die Empfehlung berücksichtigt pH (Boden, Wasser), Salz, Bodenart, Wasserbedarf vs. Wasserleistung × Fläche, Klimazone/Saison und Fruchtfolge (Pflanzenfamilie, Pausenjahre). |
| M7 | **Anbauanleitung** pro Kultur: Pflanzzeit für die Region, Abstand, Tiefe, Bewässerung, Pflege, Erntezeitpunkt. |
| M8 | **Kalender:** Nach Wahl von Kultur und Startdatum wird ein Zeitplan von Bodenvorbereitung bis Ernte erzeugt (Aufgaben mit Datum). |
| M9 | **Düngeplan:** Menge (kg/ha und für die Feldfläche) und Zeitpunkt für N, P, K, berechnet aus Bedarf der Kultur minus Bodenvorrat; dazu organische Option (Mist/Kompost). |
| M10 | Aufgaben im Kalender lassen sich abhaken; fällige und überfällige Aufgaben werden hervorgehoben. |
| M11 | **Krankheitshilfe:** Kultur wählen, Symptome per Auswahl (Fotos/Symbole) und Freitext beschreiben, Foto anhängen. Ausgabe: wahrscheinlichste Ursachen mit Sicherheitsgrad. |
| M12 | **Maßnahmenliste** je Ursache: sofort / in den nächsten Tagen / vorbeugend; biologische Mittel zuerst, chemische mit Hinweis auf Zulassung (ONSSA) und Wartezeit bis zur Ernte. |
| M13 | **Kontrollfenster:** Die Maßnahmen erzeugen Nachkontroll-Termine (z. B. Tag 3, 7, 14, dann wöchentlich) bis zur Ernte, die im Kalender erscheinen. |
| M14 | **Startdatenbank Marokko** mit 15 Kulturen: Tomate, Kartoffel, Zwiebel, Paprika, Zucchini, Melone, Wassermelone, Erdbeere, Karotte, Hartweizen, Gerste, Mais, Kichererbse, Ackerbohne, Luzerne – mit je den häufigsten Krankheiten/Schädlingen. |
| M15 | **5 Klimazonen Marokko:** Küste Nord/Gharb, Saïss/Mittelland, Atlas-Vorland, Souss/Süden, Oasen/Präsahara – mit Saisonzeiten und Frostrisiko. |
| M16 | Alle Daten werden **lokal auf dem Gerät** gespeichert und bleiben nach Schließen erhalten. |

## 3. Soll-Anforderungen

| Nr | Anforderung |
|----|-------------|
| S1 | **KI-Bilddiagnose auf eigenem Server:** Das Foto wird an eine lokale KI auf dem Server des Nutzers geschickt (z. B. Ollama mit Bildmodell wie Qwen2.5-VL oder Gemma 3, optional zusätzlich ein spezialisiertes Pflanzenkrankheits-Modell). Server-Adresse in den Einstellungen; Ergebnis fließt mit den Symptomen in M11 ein. Ohne erreichbaren Server arbeitet die App regelbasiert weiter. |
| S2 | Mehrere Felder pro Betrieb. |
| S3 | **Feldtagebuch:** erledigte Aufgaben und Beobachtungen werden gespeichert und füllen die Vorgeschichte automatisch. |
| S4 | App lässt sich aufs Handy legen (PWA) und funktioniert **offline** (außer KI-Diagnose). |
| S5 | Export des Plans als PDF/Druck. |
| S6 | Sprachen Arabisch (rechtsbündig, Ziffern 0–9) und Französisch. |

## 4. Kann-Anforderungen

| Nr | Anforderung |
|----|-------------|
| K1 | Wetterdaten online (z. B. Open-Meteo, kostenlos) für Frost-/Hitzewarnungen und Bewässerungshinweise. |
| K2 | Dauerkulturen (Olive, Zitrus, Dattelpalme, Mandel). |
| K3 | Erinnerungen als Benachrichtigung auf dem Handy. |
| K4 | Datensicherung als Datei (Export/Import). |
| K5 | Ertrags- und Kostenschätzung. |

## 5. Nicht-funktionale Anforderungen
- **Plattform:** moderner Browser auf Handy, Tablet und PC; Handy zuerst gestaltet.
- **Geschwindigkeit:** Start unter 2 Sekunden, Empfehlung sofort (< 0,5 s), keine großen Frameworks.
- **Offline:** Kernfunktionen ohne Internet.
- **Datenschutz:** Daten bleiben auf dem Gerät; bei der KI-Diagnose geht das Foto nur an den eigenen Server.
- **Bedienbarkeit:** große Knöpfe, Schrift ≥ 16 px, klare Sprache ohne Fachbegriffe (Fachwerte mit Erklärung „Was ist das?“), Hell-/Dunkelmodus, auch in praller Sonne lesbar.
- **Ehrlichkeit:** Jede Empfehlung ist als Hinweis gekennzeichnet; bei Pflanzenschutzmitteln Hinweis auf örtliche Zulassung und Fachberatung (ONCA).
- **Erweiterbarkeit:** Kulturen, Krankheiten und Zonen in separaten Datendateien, damit sie ohne Code-Änderung ausgebaut werden können.

## 6. Rahmenbedingungen
- **Budget:** keine laufenden Kosten für Kernfunktionen (kein Server, keine Datenbank in der Cloud).
- **KI-Bilddiagnose (S1):** läuft auf dem eigenen Server des Nutzers, keine Kosten pro Analyse, Fotos verlassen nicht den eigenen Server. Voraussetzung: Server mit ausreichend Leistung (für ein 7B-Bildmodell ca. 8–16 GB Grafikspeicher oder Apple-Silicon-Mac mit 16 GB+; ohne Grafikkarte möglich, aber langsam) und Erreichbarkeit vom Handy (Heimnetz oder abgesicherter Zugang). Vorgehen: zuerst kostenlos auf dem Mac des Nutzers testen; erst bei echten Nutzern einen GPU-Server mieten (z. B. Hetzner GEX44, ca. 184 €/Monat, Stand 2026).
- **Technik:** statische Web-App (HTML, CSS, JavaScript), Daten als JSON, Speicherung im Browser.
- **Fachdaten:** Richtwerte aus allgemein anerkannter Agrarliteratur; keine Garantie für exakte lokale Werte.

## 7. Abnahmekriterien
1. Ein Feld mit allen Werten lässt sich anlegen und ist nach Neuladen noch da.
2. Für ein Testfeld (z. B. Souss, Boden pH 7,8, lehmig, Wasser EC 2,5, Tomate im Vorjahr) zeigt die App eine plausible, begründete Rangliste; Tomate/Kartoffel/Paprika werden wegen Fruchtfolge abgewertet.
3. Für eine gewählte Kultur entsteht ein Kalender mit Düngeplan und Ernte-Termin; Aufgaben lassen sich abhaken.
4. Bei Eingabe typischer Symptome (z. B. Tomate, braune Flecken mit Ringen auf unteren Blättern) erscheint die passende Krankheit (Dürrfleckenkrankheit) unter den ersten 3 Treffern, mit Maßnahmen und Kontrollterminen im Kalender.
5. Die App läuft auf Handy und PC, hell und dunkel, ohne Layoutfehler (Screenshots geprüft).
