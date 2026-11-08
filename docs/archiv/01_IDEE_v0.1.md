# Idee – Fallahkalender
Version: 0.1   ·   Status: 📝 Entwurf   ·   Datum: 08.11.2026

## Versionsverlauf
| Version | Datum | Änderung | Status |
|---------|-------|----------|--------|
| 0.1 | 08.11.2026 | Erster Entwurf aus der Projektbeschreibung | Entwurf |

---

## 1. Projektname und Ein-Satz-Beschreibung
**Fallahkalender** (von arabisch *Fallah* = Bauer): Eine App, die aus den Daten deines Ackers (Wasser, Boden, Lage, Vorgeschichte) ableitet, **was** du anbauen kannst, **wie** du es anbaust und **wann** was zu tun ist – und dir bei Krankheiten mit Bild und Beschreibung hilft, bis zur Ernte.

## 2. Problem
- Landwirte und Kleinbauern wissen oft nicht genau, welche Kultur zu ihrem Boden, Wasser und Klima passt.
- Bodenanalysen und Wasserwerte liegen als Zahlen vor, aber niemand übersetzt sie in konkrete Entscheidungen.
- Dünge- und Arbeitspläne werden aus dem Kopf gemacht; Termine werden vergessen.
- Krankheiten und Schädlinge werden zu spät oder falsch erkannt; es fehlt ein klarer Ablauf „was tun, wann nachkontrollieren“.

## 3. Zielgruppe
- Klein- und Mittelbauern, Familienbetriebe, Nebenerwerbslandwirte.
- 💡 Vorschlag: auch Hobby- und Selbstversorger-Gärtner (gleiche Logik, kleinere Fläche).
- 💡 Vorschlag: mehrsprachig denken (Deutsch, Arabisch, Französisch), da der Name auf Nordafrika/Arabischsprachige hinweist.

## 4. Kernidee und Hauptfunktionen (nach Wichtigkeit)

### F1 – Ackerprofil anlegen (Eingabe)
- **Wasser:** pH-Wert, 💡 zusätzlich Salzgehalt (EC-Wert), da er für Bewässerung oft wichtiger ist als der pH.
- **Wasserleistung:** verfügbare Menge (z. B. m³/Tag oder l/Stunde aus Brunnen/Leitung), Bewässerungsart (Tropf, Furche, Regen).
- **Boden:** Ergebnisse der Bodenanalyse – pH, Humus, Stickstoff (N), Phosphor (P), Kalium (K), Bodenart (Sand/Lehm/Ton), 💡 optional Kalk und Salz.
- **Lage:** Standort per Karte/GPS → daraus automatisch Klimazone, Frosttermine, Niederschlag, Temperaturverlauf.
- **Fläche:** Größe des Feldes.
- **Vorgeschichte:** Was stand in den letzten 3–5 Jahren auf dem Feld (Fruchtfolge), welche Probleme gab es (Krankheiten, Schädlinge, schlechte Erträge).

### F2 – Anbauempfehlung
- Liste der passenden Kulturen, sortiert nach Eignung (z. B. „sehr gut / gut / mit Einschränkung“).
- Begründung in einfachen Worten: *„Tomate passt, weil pH 6,5 ideal ist; Achtung: Wasser reicht nur für 0,3 ha.“*
- Berücksichtigt Fruchtfolge (z. B. keine Tomate nach Kartoffel).
- 💡 Vorschlag: Ausschlussgründe anzeigen („Warum nicht Mais?“), damit der Nutzer lernt.

### F3 – Anbauanleitung
- Pro Kultur: Aussaat/Pflanzzeit, Abstand, Saattiefe, Bewässerung, Pflege, Erntezeit.
- Angepasst an Standort und Bodenwerte.

### F4 – Plan / Kalender (das Herz des „Fallahkalenders“)
- Automatischer Zeitplan von Bodenvorbereitung bis Ernte.
- **Düngeplan:** was, wie viel, wann – berechnet aus Bodenwerten und Bedarf der Kultur.
- Weitere Aufgaben: Bewässerung, Hacken, Pflanzenschutz-Vorbeugung, Ernte.
- Erinnerungen an fällige Aufgaben, Abhaken erledigter Arbeiten.

### F5 – Krankheits- und Schädlingserkennung
- Foto(s) hochladen + kurze Beschreibung (z. B. „gelbe Flecken auf unteren Blättern“).
- Die App nennt die wahrscheinlichsten Ursachen mit Sicherheitsgrad.
- **Maßnahmenliste:** sofort / in den nächsten Tagen / vorbeugend; 💡 biologische Mittel zuerst, chemische als Option mit Wartezeit bis zur Ernte.
- **Kontrollfenster:** automatisch eingeplante Nachkontrollen (z. B. Tag 3, 7, 14) bis zur Ernte, direkt im Kalender.

## 5. 💡 Verbesserungs- und Optimierungsvorschläge von Claude
1. **Fokus fürs erste Produkt:** F1 + F2 + F4 sind regelbasiert und ohne KI machbar und zuverlässig. F5 (Bilderkennung) wird über ein KI-Bildmodell angebunden und kommt als eigene Etappe.
2. **Feldtagebuch:** Jede Aktion und Beobachtung wird gespeichert → die „Vorgeschichte“ füllt sich in den Folgejahren automatisch.
3. **Offline-fähig:** Auf dem Feld gibt es oft kein Netz. Eingaben und Plan sollen offline funktionieren; nur Wetter und Bildanalyse brauchen Internet.
4. **Mehrere Felder** pro Betrieb.
5. **Ehrlichkeit:** Empfehlungen sind Hinweise, keine Garantie. Bei Pflanzenschutzmitteln immer auf die örtliche Zulassung hinweisen.
6. **Einfache Bedienung:** große Knöpfe, wenig Text, Symbole – nutzbar mit Handschuhen und in der Sonne.

## 6. Was bewusst NICHT dazugehört (erste Version)
- Kein Marktplatz / Verkauf der Ernte.
- Keine Maschinen-/Sensoranbindung (IoT), keine Drohnen.
- Keine Buchhaltung oder Förderanträge.
- Keine eigene KI-Trainingsdatenbank – wir nutzen ein bestehendes Bildmodell.

## 7. Offene Fragen
1. **Zielplattform:** Handy-App (Android/iPhone), Webseite im Browser, oder beides? *(Mein Vorschlag: zuerst eine Web-App, die sich wie eine App aufs Handy legen lässt und offline läuft – ein Code für alle Geräte.)*
2. **Region und Sprache:** Für welches Land/Klima zuerst (z. B. Marokko, Deutschland)? Und in welchen Sprachen soll die App sein?
3. **Kulturen:** Welche Pflanzen sollen am Anfang dabei sein (z. B. 10–15 Gemüse- und Feldkulturen), oder soll ich eine typische Auswahl für die Region vorschlagen?
