#!/usr/bin/env python3
"""Stimme mit einem VITS-/MMS-Modell von Hugging Face (z. B. facebook/mms-tts-ara).

Aufruf (vom Server): python3 stimme_mms.py <modell-id> <ausgabe.wav>   Text kommt über stdin.
Braucht: pip install transformers torch numpy (einmalig; Modell wird beim ersten Mal geladen).
"""
import re
import sys
import wave

import numpy as np
import torch
from transformers import AutoTokenizer, VitsModel


# Tifinagh (IRCAM) -> Lateinschrift, für Modelle, die nur Latein kennen (z. B. mms-tts-shi)
TIFINAGH = {
    'ⴰ': 'a', 'ⴱ': 'b', 'ⴳ': 'g', 'ⴷ': 'd', 'ⴹ': 'ḍ', 'ⴻ': 'e', 'ⴼ': 'f', 'ⴽ': 'k', 'ⵀ': 'h',
    'ⵃ': 'ḥ', 'ⵄ': 'ε', 'ⵅ': 'ḫ', 'ⵇ': 'q', 'ⵉ': 'i', 'ⵊ': 'j', 'ⵍ': 'l', 'ⵎ': 'm', 'ⵏ': 'n',
    'ⵓ': 'u', 'ⵔ': 'r', 'ⵕ': 'ṛ', 'ⵖ': 'ġ', 'ⵙ': 's', 'ⵚ': 'ṣ', 'ⵛ': 'š', 'ⵜ': 't', 'ⵟ': 'ṭ',
    'ⵡ': 'w', 'ⵢ': 'y', 'ⵣ': 'z', 'ⵥ': 'ẓ', 'ⵯ': 'w', 'ⵞ': 'č', 'ⴵ': 'ǧ',
}
ERSATZ = {'ṛ': 'r', 'ġ': 'ɣ', 'ɣ': 'ġ', 'ε': 'ɛ', 'ɛ': 'ε', 'ḫ': 'x', 'č': 'š', 'ǧ': 'j', 'e': ''}


def umschrift(text, vokabular):
    """Tifinagh in Lateinschrift umwandeln, wenn das Modell kein Tifinagh kennt."""
    if not any(z in TIFINAGH for z in text) or any(z in vokabular for z in TIFINAGH):
        return text
    aus = []
    for z in text:
        z = TIFINAGH.get(z, z)
        if z not in vokabular and z in ERSATZ:
            z = ERSATZ[z]
        aus.append(z)
    return ''.join(aus)


def saetze(text, laenge=220):
    teile = re.split(r'(?<=[.!?؟؛:\n،,])\s+', text)
    stueck = ''
    for t in teile:
        if len(stueck) + len(t) > laenge and stueck:
            yield stueck
            stueck = ''
        stueck = f'{stueck} {t}'.strip()
    if stueck:
        yield stueck


def main():
    modell_id, ausgabe = sys.argv[1], sys.argv[2]
    text = sys.stdin.read().strip()
    tok = AutoTokenizer.from_pretrained(modell_id)
    text = umschrift(text, set(tok.get_vocab()))
    modell = VitsModel.from_pretrained(modell_id)
    roman = None
    if getattr(tok, 'is_uroman', False):
        from uroman import Uroman  # pip install uroman
        roman = Uroman()
    rate = modell.config.sampling_rate
    pause = np.zeros(int(rate * 0.25), dtype=np.float32)
    stuecke = []
    for satz in saetze(text):
        eingabe = roman.romanize_string(satz) if roman else satz
        ids = tok(eingabe, return_tensors='pt')
        if ids['input_ids'].shape[-1] < 2:
            continue
        with torch.no_grad():
            welle = modell(**ids).waveform[0].cpu().numpy()
        stuecke += [welle, pause]
    welle = np.concatenate(stuecke) if stuecke else pause
    daten = (np.clip(welle, -1, 1) * 32767).astype('<i2').tobytes()
    with wave.open(ausgabe, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(daten)


if __name__ == '__main__':
    main()
