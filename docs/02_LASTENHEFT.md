# Lastenheft – Fallahkalender
Version: 4.0   ·   Status: ✅ freigegeben   ·   Datum: 08.11.2026

## Versionsverlauf
| Version | Datum | Änderung | Status |
|---------|-------|----------|--------|
| 0.1 | 08.11.2026 | Erster Entwurf aus Idee v1.0 | Entwurf |
| 0.2 | 08.11.2026 | Bilderkennung über eigene lokale KI auf dem Server des Nutzers statt Cloud-API | Entwurf |
| 1.0 | 08.11.2026 | Hinweis zu Server-Kosten ergänzt, freigegeben | ✅ |
| 1.1 | 08.11.2026 | M17–M19: Fellah-Kalender und Anwāʾ-Kalender | Entwurf |
| 2.0 | 08.11.2026 | Freigegeben | ✅ |
| 2.1 | 08.11.2026 | M20 Machbar-Maßnahmen, M21–M22 Förderung und staatliche Dienste | Entwurf |
| 3.0 | 08.11.2026 | Freigegeben auf Wunsch des Nutzers; nur zinsfreie Hilfen | ✅ |
| 4.0 | 08.11.2026 | Deutsch raus; M23 Sprachen Arabisch, Französisch, Darija, Tamazight; M24 Vorlesen; S7 eigene Server-Stimmen; Auftrag des Nutzers | ✅ |

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
| M17 | **Fellah-Kalender:** Zu jedem Datum wird das Datum im Bauernkalender (julianisch, Monatsnamen wie يناير، فبراير، مارس… in der marokkanischen Form) und das Amazigh-Jahr angezeigt; Umrechnung in beide Richtungen. |
| M18 | **Abschnitte des Bauernjahres** (u. a. الليالي، الحسوم، نيسان، العنصرة، السمايم) mit Zeitraum, Bedeutung und typischen Arbeiten; im Kalender als Band sichtbar. |
| M19 | **Anwāʾ-Kalender:** die 28 Anwāʾ/منازل mit Zeitraum (ca. 13 Tage), überlieferter Wetterbedeutung und passenden Feldarbeiten; „Heute“-Anzeige des aktuellen Nawʾ; jede Aufgabe im Plan zeigt ihren Nawʾ. |
| M20 | **Machbar machen:** Für jede Kultur mit Einschränkung oder „nicht geeignet“ listet die App je Problem (pH, Salz, Wasser, Bodenart, Pflanzzeit, Fruchtfolge, Nematoden/Welke, Kalk) Maßnahmen auf, sortiert vom einfachsten zum schwierigsten, mit Aufwand (gering/mittel/hoch), ungefährer Wirkungsdauer und Förderhinweis. |
| M21 | **Förderungen (FDA):** Übersicht der wichtigsten Fördersätze und Obergrenzen (Bewässerung, Becken, Gewächshaus, Geräte, Pflanzungen, Saatgut, Laboranalysen), Ablauf (Vorab-Genehmigung → Umsetzung → Antrag) und Hauptunterlagen; Link zum elektronischen Schalter (GUE). Jede Angabe mit Quelle und Prüfdatum. |
| M22 | **Staatliche Dienste:** Zuständige Stellen (DPA, ORMVA, ONCA, ONSSA, INRA, ABH, ADA, ODCO, Al Moutmir) mit Aufgabe, Webseite und Kontakt; passend zur Region des Feldes vorausgewählt; ungeprüfte Angaben gekennzeichnet. |
| M23 | **Sprachen:** Arabisch (Standard), Französisch, Darija (in arabischer Schrift) und Tamazight (Zentralatlas, in Tifinagh). Keine deutsche Oberfläche. Umschalter oben in jeder Ansicht, Wahl bleibt gespeichert. Arabisch und Darija immer rechtsbündig und rechtsläufig, alle Zahlen mit Ziffern 0–9. Alle Inhalte (Kulturen, Begründungen, Maßnahmen, Krankheiten, Hilfe, Kalender) sind übersetzt; was in Tamazight noch fehlt, erscheint auf Arabisch. |
| M24 | **Vorlesen:** Knopf „Anhören“ in jeder Ansicht und in jedem aufgeklappten Ergebnis (Kultur, Krankheit). Liest den sichtbaren Text in der gewählten Sprache vor; zweiter Druck hält an. Arabisch und Französisch über die Stimme des Geräts; Darija vorerst mit arabischer Gerätestimme, bis die eigene Stimme (S7) da ist. |

## 3. Soll-Anforderungen

| Nr | Anforderung |
|----|-------------|
| S1 | **KI-Bilddiagnose auf eigenem Server:** Das Foto wird an eine lokale KI auf dem Server des Nutzers geschickt (z. B. Ollama mit Bildmodell wie Qwen2.5-VL oder Gemma 3, optional zusätzlich ein spezialisiertes Pflanzenkrankheits-Modell). Server-Adresse in den Einstellungen; Ergebnis fließt mit den Symptomen in M11 ein. Ohne erreichbaren Server arbeitet die App regelbasiert weiter. |
| S2 | Mehrere Felder pro Betrieb. |
| S3 | **Feldtagebuch:** erledigte Aufgaben und Beobachtungen werden gespeichert und füllen die Vorgeschichte automatisch. |
| S4 | App lässt sich aufs Handy legen (PWA) und funktioniert **offline** (außer KI-Diagnose). |
| S5 | Export des Plans als PDF/Druck. |
| S6 | ~~Sprachen Arabisch und Französisch~~ → jetzt Muss-Anforderung M23. |
| S7 | **Eigene Stimmen auf dem Server:** Darija und Tamazight werden von einer Sprach-KI auf dem eigenen Server vorgelesen (gleicher Server wie S1, z. B. offene Darija- und Amazigh-Stimmen von Hugging Face). Zuerst kostenlos auf dem Mac testen. Ohne Server liest das Gerät auf Arabisch. |

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
- **Halal / zinsfrei (Pflicht):** Die App nennt keine Banken (auch keine partizipativen), keine Kredite, Mikrokredite oder Versicherungen (auch kein Takaful). Nur Zuschüsse ohne Rückzahlung, kostenlose Dienste und Kooperativen. Ein Test prüft das.
- **Datenschutz:** Daten bleiben auf dem Gerät; bei der KI-Diagnose geht das Foto nur an den eigenen Server.
- **Bedienbarkeit:** große Knöpfe, Schrift ≥ 16 px, klare Sprache ohne Fachbegriffe (Fachwerte mit Erklärung „Was ist das?“), Hell-/Dunkelmodus, auch in praller Sonne lesbar.
- **Ehrlichkeit:** Jede Empfehlung ist als Hinweis gekennzeichnet; bei Pflanzenschutzmitteln Hinweis auf örtliche Zulassung und Fachberatung (ONCA).
- **Erweiterbarkeit:** Kulturen, Krankheiten und Zonen in separaten Datendateien, damit sie ohne Code-Änderung ausgebaut werden können.

## 6. Rahmenbedingungen
- **Budget:** keine laufenden Kosten für Kernfunktionen (kein Server, keine Datenbank in der Cloud).
- **KI-Bilddiagnose (S1):** läuft auf dem eigenen Server des Nutzers, keine Kosten pro Analyse, Fotos verlassen nicht den eigenen Server. Voraussetzung: Server mit ausreichend Leistung (für ein 7B-Bildmodell ca. 8–16 GB Grafikspeicher oder Apple-Silicon-Mac mit 16 GB+; ohne Grafikkarte möglich, aber langsam) und Erreichbarkeit vom Handy (Heimnetz oder abgesicherter Zugang). Vorgehen: zuerst kostenlos auf dem Mac des Nutzers testen; erst bei echten Nutzern einen GPU-Server mieten (z. B. Hetzner GEX44, ca. 184 €/Monat, Stand 2026).
- **Technik:** statische Web-App (HTML, CSS, JavaScript), Daten als JSON, Speicherung im Browser.
- **Traditionelle Kalender:** Zeiträume und Bedeutungen variieren je nach Region und Quelle; die App nutzt eine verbreitete marokkanische Fassung und markiert die Angaben als Überlieferung. Daten in eigener JSON-Datei, damit regionale Varianten ergänzt werden können.
- **Förderdaten:** Sätze ändern sich (FDA-Erlass Bewässerung gilt bis 31.12.2027); Daten in eigener JSON-Datei mit Quelle und Prüfdatum, Hinweis „vor dem Antrag beim Guichet unique bestätigen“.
- **Fachdaten:** Richtwerte aus allgemein anerkannter Agrarliteratur; keine Garantie für exakte lokale Werte.

## 7. Abnahmekriterien
1. Ein Feld mit allen Werten lässt sich anlegen und ist nach Neuladen noch da.
2. Für ein Testfeld (z. B. Souss, Boden pH 7,8, lehmig, Wasser EC 2,5, Tomate im Vorjahr) zeigt die App eine plausible, begründete Rangliste; Tomate/Kartoffel/Paprika werden wegen Fruchtfolge abgewertet.
3. Für eine gewählte Kultur entsteht ein Kalender mit Düngeplan und Ernte-Termin; Aufgaben lassen sich abhaken.
4. Bei Eingabe typischer Symptome (z. B. Tomate, braune Flecken mit Ringen auf unteren Blättern) erscheint die passende Krankheit (Alternariose, اللفحة المبكرة) unter den ersten 3 Treffern, mit Maßnahmen und Kontrollterminen im Kalender.
5. Für den 14.01. zeigt die App „1. يناير“ im Fellah-Kalender und das neue Amazigh-Jahr; für ein beliebiges Datum den passenden Nawʾ und Abschnitt (z. B. 07.07. → العنصرة).
6. Für Tomate im Souss mit salzigem Wasser zeigt die App mindestens 3 Maßnahmen, die erste mit geringem Aufwand, Tropfbewässerung mit Förderhinweis.
7. Die Förder-Ansicht zeigt für ein Feld im Souss das ORMVA Souss-Massa bzw. die DPA, den Ablauf und den Link zum GUE.
8. Die App läuft auf Handy und PC, hell und dunkel, ohne Layoutfehler (Screenshots geprüft).
9. Die App startet auf Arabisch, rechtsbündig, mit Ziffern 0–9. Nach Wechsel auf Französisch, Darija oder Tamazight erscheint kein deutsches Wort und kein Textschlüssel; der Ablauf aus 1–7 funktioniert in jeder Sprache (UI-Test).
10. In Arabisch, Darija und Französisch hat jede Ansicht einen Vorlese-Knopf.
