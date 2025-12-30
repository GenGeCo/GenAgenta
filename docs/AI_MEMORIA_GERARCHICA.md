# GenAgenta AI - Architettura Memoria Gerarchica

## Visione
Un'AI che "ricorda come un umano": il recente è vivido, il lontano sfuma, ma le cose importanti restano.

---

## Architettura a 3 Livelli di Memoria

### 1. Working Memory (Calda) - MAX 30 righe
```
Cosa contiene:
- Contesto conversazione corrente
- Ultime 3-5 entità menzionate
- Decisioni/conclusioni recenti della sessione
- KPI chiave dell'utente (calcolati, non storici)

Storage: Redis/Session (TTL 1 ora)
Costo prompt: ~500-1000 token
```

### 2. Memoria Episodica (Eventi) - Database strutturato
```
Cosa contiene:
- Eventi business rilevanti (accordi, problemi, cambiamenti)
- Ogni evento ha metadati per ranking

Schema proposto:
CREATE TABLE ai_eventi (
    id UUID PRIMARY KEY,
    utente_id UUID,
    azienda_id UUID,

    -- Contenuto
    tipo VARCHAR(50),        -- 'accordo', 'problema', 'nota', 'decisione'
    titolo VARCHAR(200),
    contenuto TEXT,

    -- Entità coinvolte (per join veloci)
    neurone_ids JSON,        -- ["uuid1", "uuid2"]
    sinapsi_ids JSON,

    -- Ranking dinamico
    data_evento TIMESTAMP,
    importanza INT DEFAULT 5,     -- 1-10
    frequenza_uso INT DEFAULT 0,  -- quante volte recuperato
    ultimo_uso TIMESTAMP,

    -- Lifecycle
    scadenza DATE NULL,           -- dopo questa data, archivia
    compresso BOOLEAN DEFAULT FALSE,
    fonte_originale_id UUID NULL, -- se è sintesi di altri eventi

    -- Embedding per ricerca semantica (opzionale)
    embedding VECTOR(1536) NULL,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_eventi_ranking ON ai_eventi(
    utente_id,
    (importanza * 2 + frequenza_uso - EXTRACT(days FROM NOW() - data_evento))
);
```

### 3. Archivio Freddo - File/Blob storage
```
Cosa contiene:
- Email lunghe
- PDF allegati
- Note storiche verbose
- Trascrizioni

Storage: File system o S3
Accesso: Solo quando esplicitamente richiesto o referenziato
Non va MAI nel prompt direttamente - solo estratti/sintesi
```

---

## Sistema di Ranking Dinamico

### Formula Score
```
score = (recency * 0.3) + (frequency * 0.2) + (importance * 0.4) - (token_cost * 0.1)

Dove:
- recency = 10 - min(10, giorni_da_evento / 30)  // decade in ~10 mesi
- frequency = min(10, volte_usato / 5)           // max 10 dopo 50 usi
- importance = valore 1-10 assegnato             // fisso o AI-assigned
- token_cost = lunghezza_testo / 500             // penalizza verbose
```

### Soglie
```
score >= 7: Sempre nel prompt (se rilevante)
score 4-7:  Nel prompt se spazio disponibile
score < 4:  Solo se esplicitamente cercato
```

---

## Retrieval a Imbuto

### Fase 1: Query Veloce (< 50ms)
```sql
-- Recupera candidati per entità menzionate
SELECT id, titolo, tipo, score
FROM ai_eventi
WHERE utente_id = ?
  AND (neurone_ids @> ? OR keyword ILIKE ?)
ORDER BY score DESC
LIMIT 20;
```

### Fase 2: Reranking Semantico (opzionale)
```
Se la query è ambigua:
1. Calcola embedding della domanda utente
2. Cosine similarity con embedding eventi
3. Riordina i 20 candidati
```

### Fase 3: Espansione Selettiva
```
Solo per i top 5 eventi:
- Recupera contenuto completo
- Se troppo lungo (>500 token), usa versione compressa
```

---

## Ruoli AI (Multi-Agent in sequenza)

### 1. PLANNER (Claude Haiku - veloce/economico)
```
Input: Domanda utente + Working Memory
Output: Piano di retrieval

Prompt: ~300 token
"Dato questo contesto e domanda, dove devo cercare?
- [ ] Query SQL diretta (quale?)
- [ ] Memoria episodica (keywords?)
- [ ] Archivio freddo (necessario?)
Rispondi in JSON."
```

### 2. EXECUTOR (Codice PHP/JS - no AI)
```
Esegue il piano:
- Query SQL per dati strutturati
- Ricerca eventi con ranking
- Recupera documenti se richiesto
- Assembla contesto
```

### 3. RESPONDER (Claude Sonnet - qualità)
```
Input: Domanda + Dati recuperati + Working Memory
Output: Risposta finale

Prompt: ~1000-3000 token (controllato)
"Rispondi in modo conciso e umano.
Se non hai abbastanza info, dillo.
Aggiorna la working memory con nuove conclusioni."
```

---

## Compressione Continua (Job Notturno)

### Trigger
- Eventi con score < 3 e età > 90 giorni
- Cluster di eventi simili sulla stessa entità

### Processo
```
1. Raggruppa eventi vecchi per entità
2. Chiedi a AI (Haiku): "Sintetizza questi X eventi in 2-3 frasi"
3. Crea nuovo evento "sintesi" con:
   - contenuto = sintesi
   - fonte_originale_id = [ids eventi originali]
   - importanza = max(importanze originali)
4. Marca originali come compressi (non eliminare!)
```

---

## Flusso Completo - Esempio

```
UTENTE: "Come sta andando con Rossi Costruzioni?"

1. WORKING MEMORY CHECK
   - Rossi Costruzioni menzionato? No
   - Ultima conversazione? Diverso argomento

2. PLANNER (Haiku, 300 token)
   Input: "Domanda su Rossi Costruzioni"
   Output: {
     "sql": ["vendite ultimi 6 mesi per neurone", "sinapsi attive"],
     "eventi": ["keywords: Rossi, costruzioni, problema, accordo"],
     "archivio": false
   }

3. EXECUTOR
   SQL Results:
   - Vendite: €45.000 (6 mesi), trend +12%
   - 3 sinapsi attive (2 commerciali, 1 tecnico)

   Eventi (top 3 per score):
   - [score 8.2] "Accordo sconto 15% su grandi ordini" (2 mesi fa)
   - [score 6.5] "Problema ritardo consegna risolto" (4 mesi fa)
   - [score 5.1] "Referente cambiato: ora Mario Bianchi" (3 mesi fa)

4. RESPONDER (Sonnet, ~1500 token totali)
   Input: Dati SQL + 3 eventi + domanda
   Output: "Rossi Costruzioni sta andando bene: €45k negli ultimi
            6 mesi (+12%). Abbiamo un accordo per sconto 15% sui
            grandi ordini. Il referente attuale è Mario Bianchi.
            Nessun problema aperto."

5. UPDATE WORKING MEMORY
   Aggiungi: "Discusso Rossi Costruzioni - situazione positiva"
   Incrementa: frequenza_uso degli eventi usati
```

---

## Implementazione - Fasi

### Fase 1: Fondamenta (1-2 settimane)
- [ ] Tabella ai_eventi + API CRUD
- [ ] Endpoint /ai/chat base (senza memoria)
- [ ] Integrazione Claude API (Sonnet)

### Fase 2: Memoria Base (1-2 settimane)
- [ ] Working memory (session storage)
- [ ] Retrieval eventi semplice (no ranking)
- [ ] Query SQL predefinite per KPI

### Fase 3: Ranking e Ottimizzazione (1 settimana)
- [ ] Formula score implementata
- [ ] Retrieval a imbuto
- [ ] Planner con Haiku

### Fase 4: Compressione (1 settimana)
- [ ] Job notturno sintesi
- [ ] Archivio freddo
- [ ] Embedding semantici (opzionale)

---

## Costi Stimati (per 1000 domande/mese)

```
Planner (Haiku):     1000 × 500 token  = 500k token  ≈ $0.25
Responder (Sonnet):  1000 × 2000 token = 2M token    ≈ $6.00
                                         TOTALE      ≈ $6.25/mese

vs RAG classico:     1000 × 8000 token = 8M token    ≈ $24/mese
                                         RISPARMIO    75%
```

---

## Note Tecniche

### API Claude da usare
- claude-3-haiku per Planner (veloce, economico)
- claude-sonnet-4-20250514 per Responder (qualità)

### Considerazioni Privacy
- Tutti i dati restano nel DB GenAgenta
- Solo snippet necessari vanno a Claude
- Nessun training sui dati utente

### Fallback
- Se Claude non disponibile: risposta "Servizio AI temporaneamente non disponibile"
- Se dati insufficienti: "Non ho abbastanza informazioni su X, vuoi che cerchi nell'archivio?"
