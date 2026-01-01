# Approccio AI di GenAgenta

## Il Problema

L'AI ha centinaia di operazioni possibili (creare entità, connessioni, transazioni,
navigare mappa, zoomare, filtrare, etc.). Come le insegniamo tutte?

### Approccio SBAGLIATO (quello che abbiamo provato):
1. Scrivere documentazione dettagliata per ogni operazione
2. L'AI legge la documentazione e segue le istruzioni
3. **Problema**: la documentazione è spesso sbagliata/incompleta
4. **Risultato**: l'AI fa errori seguendo istruzioni sbagliate

### Approccio CORRETTO (quello attuale):
1. L'AI sa COSA può fare (lista generale)
2. L'AI NON sa COME farlo nei dettagli
3. L'AI prova → l'API le dice se sbaglia → l'AI corregge
4. **L'API è il "maestro", non la documentazione**

---

## Come Funziona

### System Prompt (minimalista ~35 righe)
```
Puoi:
- Gestire entità (clienti, fornitori, cantieri)
- Gestire connessioni tra entità
- Registrare transazioni
- Controllare la mappa

Come: usa call_api(). Se sbagli, l'API ti dice cosa correggere.
```

### Tool Principale
```
call_api(method, endpoint, body)
```
Chiama le STESSE API REST che usa il frontend.

### Flusso Tipico

```
Utente: "crea un cantiere a Milano"

AI: call_api("POST", "neuroni", {nome: "Cantiere Milano"})
API: "Errore: campo 'tipo' richiesto"

AI: call_api("POST", "neuroni", {nome: "Cantiere Milano", tipo: "cantiere"})
API: "Errore: tipo 'cantiere' non valido. Tipi disponibili: CANTIERE, IMPRESA, PERSONA"

AI: call_api("POST", "neuroni", {nome: "Cantiere Milano", tipo: "CANTIERE", categorie: ["standard"]})
API: "Creato con successo! ID: xxx"

AI: "Ho creato il cantiere. Nota: senza coordinate non apparirà sulla mappa.
     Vuoi che cerchi l'indirizzo per aggiungerle?"
```

---

## Vantaggi

| Aspetto | Prima (docs dettagliate) | Dopo (API come maestro) |
|---------|--------------------------|-------------------------|
| Nuova funzionalità | Aggiorna docs + testa | Solo aggiorna API |
| Bug nei parametri | Fix docs + fix AI | Fix solo API |
| Sincronizzazione | Docs ≠ API (divergono) | Sempre allineati |
| Token consumati | Molti (docs lunghe) | Pochi (prompt corto) |
| Errori AI | Segue docs sbagliate | Impara dagli errori |

---

## Regole per le API

Perché questo approccio funzioni, le API devono:

1. **Dare errori chiari**: "Campo 'tipo' richiesto" (non "Errore 400")

2. **Suggerire valori validi**: "Tipo 'x' non valido. Tipi disponibili: A, B, C"

3. **Essere self-documenting**: l'errore stesso insegna all'AI cosa fare

### Esempio API ben fatta:
```php
if (!$tipoRow) {
    $tipiDisponibili = getTipiDisponibili($teamId);
    errorResponse("Tipo '$tipo' non valido. Tipi disponibili: " . implode(', ', $tipiDisponibili));
}
```

---

## Documentazione Residua

Manteniamo docs SOLO per:

1. **API_INDEX.md**: Lista endpoint (cosa esiste, non come usarlo)
2. **Concetti non ovvi**: es. "per apparire sulla mappa serve lat/lng"

NON documentiamo:
- Parametri obbligatori (l'API lo dice)
- Valori validi per enum (l'API lo dice)
- Formato dei dati (l'API lo dice)

---

## Ispirazione

Questo approccio è ispirato a Claude Code:
- Claude non ha un tool per ogni linguaggio di programmazione
- Ha Read, Write, Bash e impara leggendo il codice
- Se sbaglia, legge l'errore e corregge

L'AI di GenAgenta funziona allo stesso modo:
- Non ha un tool per ogni operazione
- Ha call_api() e impara dagli errori dell'API
- L'API la guida verso la soluzione corretta

---

## Evoluzione Futura

1. **Più errori informativi**: ogni API dovrebbe dire cosa manca/sbagliato
2. **Suggerimenti contestuali**: "Hai creato l'entità ma senza coordinate. Usa geocode_address per ottenerle"
3. **Apprendimento**: l'AI può salvare cosa ha imparato per sessioni future
