# Plan – Fallahkalender
Version: 3.0   ·   Status: ✅ freigegeben   ·   Datum: 08.11.2026

## Versionsverlauf
| Version | Datum | Änderung | Status |
|---------|-------|----------|--------|
| 0.1 | 08.11.2026 | Erster Entwurf aus Lastenheft v1.0 | Entwurf |
| 0.2 | 08.11.2026 | Fellah- und Anwāʾ-Kalender in MS2 aufgenommen | Entwurf |
| 1.0 | 08.11.2026 | Freigegeben | ✅ |
| 1.1 | 08.11.2026 | Neuer MS1b: Machbar machen + Förderung und Dienste | Entwurf |
| 2.0 | 08.11.2026 | Freigegeben; MS1b fertig | ✅ |
| 3.0 | 08.11.2026 | MS6 Sprachen vorgezogen und erweitert (Darija, Tamazight, Vorlesen); Server-Stimmen in MS5 | ✅ |

---

## Gliederung
Sieben **Meilensteine**. Jeder liefert eine Version, die du im Browser öffnen und ausprobieren kannst. Die Muss-Anforderungen sind mit Meilenstein 3 und 6 erfüllt. Danach folgen Handy/offline und der eigene KI-Server.

| Nr | Meilenstein | Sichtbares Ergebnis | Anforderungen | Status | Datum |
|----|-------------|---------------------|---------------|--------|-------|
| MS1 | **Prototyp: Feld + Empfehlung** | Feld mit Wasser, Boden, Lage, Vorgeschichte anlegen; Rangliste der 15 Kulturen mit Begründung und „Warum nicht?“ | M1–M6, M14 (Kulturdaten), M15, M16 | ✅ | 08.11.2026 |
| MS1b | **Machbar machen + Förderung** | Bei jeder eingeschränkten Kultur: Maßnahmen vom einfachsten zum schwierigsten mit Förderhinweis; neue Ansicht „Hilfe & Förderung“ mit FDA-Sätzen, Ablauf, zuständigen Stellen und Kontakten für deine Region | M20–M22 | ✅ | 08.11.2026 |
| MS2 | **Anleitung + Kalender + Düngeplan + Fellah/Anwāʾ** | Kultur wählen → Anleitung, Zeitplan bis zur Ernte, Düngemengen für die eigene Fläche, Aufgaben abhaken; jedes Datum zusätzlich im Fellah-Kalender, Band mit Abschnitten des Bauernjahres und dem aktuellen Nawʾ | M7–M10, M17–M19 | ✅ | 08.11.2026 |
| MS3 | **Krankheitshilfe (ohne KI)** | Symptome anklicken + beschreiben + Foto → wahrscheinliche Ursachen, Maßnahmen, Kontrolltermine im Kalender | M11–M13, M14 (Krankheitsdaten) | ✅ | 08.11.2026 |
| MS4 | **Handy-App + offline + mehrere Felder** | App aufs Handy legen, ohne Netz nutzbar; mehrere Felder; Feldtagebuch; Plan drucken | S2–S5, K4 | ✅ | 08.11.2026 |
| MS5 | **Eigener KI-Server: Bilddiagnose + Stimmen** | Ollama-Bildmodell und Darija-/Tamazight-Stimme auf deinem Mac testen; App schickt Foto bzw. Text an deinen Server; dazu freie Fotos überall in der App | S1, S7 | ✅ (Test auf dem Mac) | 08.11.2026 |
| MS6 | **Sprachen + Vorlesen** (vorgezogen) | Deutsch raus; Arabisch, Französisch, Darija, Tamazight; Vorlese-Knopf überall | M23, M24 | ✅ | 08.11.2026 |

Status: ⏳ offen · 🔄 in Arbeit · ✅ fertig · ⛔ blockiert

Kann-Anforderungen (Wetter, Dauerkulturen wie Olive/Dattel, Benachrichtigungen, Ertragsschätzung) kommen nach MS6 oder dazwischen, wenn du sie früher willst.

## Je Meilenstein
1. Umsetzen
2. Tests der Rechenlogik (Empfehlung, Dünger, Diagnose) ausführen
3. Screenshots Handy + PC, hell + dunkel, prüfen
4. `CHANGELOG.md` und Status hier aktualisieren
5. Kurzer Bericht an dich: was fertig ist, wie du es testest, was als Nächstes kommt

## Technik (Kurzfassung, Details in ENTSCHEIDUNGEN.md)
- Reine Web-App: HTML, CSS, JavaScript – **kein Framework, keine Installation**.
- Fachdaten (Kulturen, Zonen, Krankheiten, Fellah-Abschnitte, Anwāʾ) als JSON-Dateien in `code/src/daten/` → später ohne Code erweiterbar.
- Speicherung im Browser (localStorage, Fotos in IndexedDB).
- Start per Doppelklick auf `start.command` (kleiner lokaler Webserver).
- Tests mit Node (eingebaut, ohne Zusatzpakete), Screenshots mit Playwright.

## Risiken
- **Übersetzungen** (vor allem Darija und Tamazight) stammen von Claude → du prüfst sie; Tamazight ist ein Entwurf, längere Fachtexte dort noch auf Arabisch.
- **Traditionelle Kalender** gibt es in mehreren regionalen Fassungen → eine verbreitete Fassung nehmen, als Überlieferung kennzeichnen, du prüfst die Liste vor dem Einbau.
- **Fachliche Richtwerte** sind allgemein; lokale Beratung (ONCA) bleibt wichtig → Hinweis in der App.
- **KI-Qualität** auf echten Feldfotos ist unsicher → deshalb wird sie in MS5 erst getestet, bevor ein Server gemietet wird.
