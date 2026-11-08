#!/bin/bash
# Fallahkalender starten: Doppelklick. Startet den eigenen kleinen Server (App + eigene KI) und öffnet den Browser.
cd "$(dirname "$0")/code/server" || exit 1
PORT=8765

finde_python() {
  for p in python3 /opt/homebrew/bin/python3 /usr/local/bin/python3 /usr/bin/python3; do
    if command -v "$p" >/dev/null 2>&1 && "$p" -c "import http.server, socketserver" >/dev/null 2>&1; then
      echo "$p"; return 0
    fi
  done
  return 1
}

PY=$(finde_python) || {
  echo "Kein passendes Python gefunden."
  echo "Abhilfe: Python 3 von https://www.python.org installieren und erneut starten."
  read -r -p "Enter zum Schließen"; exit 1
}

# Freien Port suchen
while lsof -i :"$PORT" >/dev/null 2>&1; do PORT=$((PORT + 1)); done

echo "Zum Beenden dieses Fenster schließen oder Ctrl+C drücken."
( sleep 1; open "http://localhost:$PORT" 2>/dev/null || xdg-open "http://localhost:$PORT" 2>/dev/null ) &
exec "$PY" server.py --port "$PORT" --host 127.0.0.1
