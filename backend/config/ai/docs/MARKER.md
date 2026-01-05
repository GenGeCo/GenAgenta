# MARKER - Segnaposti sulla mappa

I marker sono bandierine temporanee che puoi piazzare sulla mappa per indicare posizioni all'utente.

## Quando usarli

- Per rispondere a "dove inizia via X?" → piazza una bandierina
- Per mostrare un'area → piazza 2-3 bandierine ai confini
- Per indicare "guarda qui" → bandierina con etichetta
- Per segnare punti di interesse durante una conversazione

## Tool disponibili

### map_place_marker
Piazza una bandierina sulla mappa.

Parametri:
- `lat`, `lng` (obbligatori) - coordinate
- `label` (obbligatorio) - testo da mostrare (es. "Inizio Via Roma")
- `color` (opzionale) - colore: red, blue, green, orange, purple (default: red)
- `fly_to` (opzionale) - true/false, se volare alla posizione (default: false)

**LIMITE: massimo 20 marker attivi**. Se superi, rimuovine alcuni prima.

### map_remove_marker
Rimuove una bandierina specifica.

Parametri:
- `marker_id` (obbligatorio) - ID del marker da rimuovere

### map_clear_markers
Rimuove TUTTE le bandierine. Nessun parametro.

## Contesto automatico

I marker attivi ti vengono passati automaticamente nel contesto.
Vedrai qualcosa tipo:
```
Marker sulla mappa (2):
- [abc123] "Inizio Via Roma" (rosso, piazzato 2 min fa)
- [def456] "Fine Via Roma" (blu, piazzato 1 min fa)
```

Usa l'ID tra parentesi quadre per rimuovere un marker specifico.

## Esempi

### Rispondere a "dove inizia via Roma?"
```
1. reverse_geocode per trovare coordinate di "inizio via Roma"
2. map_place_marker(lat, lng, "Inizio Via Roma", fly_to: true)
3. "Ecco, ho messo una bandierina!"
```

### Mostrare un'area
```
1. Piazza 3 marker ai vertici SENZA fly_to
2. "Ho segnato i tre angoli dell'area"
3. Opzionale: fly_to su uno di essi per centrare la vista
```

### Pulire quando hai finito
```
"Abbiamo finito? Tolgo le bandierine."
map_clear_markers()
```

## Buone pratiche

1. **Etichette chiare** - "Inizio Via Roma" non "Marker 1"
2. **Non esagerare** - 3-4 marker sono sufficienti per un'area
3. **Pulisci dopo** - quando la conversazione si sposta su altro, pulisci
4. **Spiega cosa fai** - "Ti metto una bandierina qui..."
5. **fly_to solo se serve** - per singoli punti sì, per aree no
