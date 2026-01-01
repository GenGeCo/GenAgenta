# Approccio AI di GenAgenta

## Il Problema

L'AI ha centinaia di operazioni possibili (creare entità, connessioni, transazioni,
navigare mappa, zoomare, filtrare, etc.). Come le insegniamo tutte senza mappare
manualmente ogni singola operazione?

### Approcci Provati e Scartati

1. **Documentazione dettagliata** → Docs sempre sbagliate/incomplete
2. **Tool dedicati per ogni operazione** → Impossibile da mantenere
3. **Backend esegue API internamente (curl)** → Problemi 404, exit(), sessioni

---

## Soluzione Attuale: "Backend Brain, Frontend Hands"

Architettura ispirata ai Co-pilot moderni:

- **Il Cervello (AI) sta nel Backend**: logica, prompt, sicurezza
- **Le Mani (Esecuzione) stanno nel Frontend**: il browser esegue le API

### Perché Funziona

L'AI usa le **stesse API che usa l'utente** quando clicca i bottoni.
- Stessi cookie, stessa sessione, stessa autenticazione
- Se funziona per l'utente, funziona per l'AI
- Zero problemi di CORS, curl, exit()

---

## Flusso di Esecuzione

```
Utente: "Crea un cantiere a Milano"
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (Browser)                                          │
│  → Invia messaggio al backend                               │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND (PHP)                                               │
│  → Chiama OpenRouter/Claude                                 │
│  → AI decide: "devo chiamare create_entity"                 │
│  → È una WRITE operation? → SOSPENDE                        │
│  → Ritorna: {status: "pending_action", action: {...}}       │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (Browser)                                          │
│  → Riceve pending_action                                    │
│  → Esegue api.createNeurone() (stessa API del click)        │
│  → Mostra all'utente: "Sto creando..."                      │
│  → Invia risultato al backend                               │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND (PHP)                                               │
│  → Riprende con il risultato dell'API                       │
│  → AI genera risposta finale                                │
│  → Ritorna messaggio + eventuali azioni mappa               │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (Browser)                                          │
│  → Mostra risposta AI                                       │
│  → Esegue azioni mappa (fly_to, select, refresh)            │
│  → L'utente vede tutto in tempo reale!                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Tipi di Tool

### READ Tools (eseguiti dal backend)
Operazioni di sola lettura, eseguite direttamente nel backend:
- `geocode_address` - ottieni coordinate da indirizzo
- `query_database` - query SQL di lettura
- `read_file` - leggi documentazione interna
- `search_entities` - cerca nel database

### WRITE Tools (delegati al frontend)
Operazioni che modificano dati, delegate al browser:
- `create_entity` → `api.createNeurone()`
- `update_entity` → `api.updateNeurone()`
- `delete_entity` → `api.deleteNeurone()`
- `create_connection` → `api.createSinapsi()`
- `delete_connection` → `api.deleteSinapsi()`
- `create_sale` → `api.createVendita()`
- `call_api` (POST/PUT/DELETE) → chiamata API generica

### FRONTEND-ONLY Actions
Azioni che controllano l'interfaccia:
- `map_fly_to` - sposta la mappa (con zoom, pitch, bearing per rotazione)
- `map_set_style` - cambia stile mappa (satellite, streets, dark, outdoors, light)
- `map_select_entity` - seleziona un'entità
- `refresh_neuroni` - ricarica i dati sulla mappa

---

## Vantaggi

| Aspetto | Backend-only (vecchio) | Frontend Execution (attuale) |
|---------|------------------------|------------------------------|
| Autenticazione | Complessa (token interni) | Usa sessione utente |
| Cookie/CORS | Problemi con curl | Zero problemi |
| Interattività | L'utente non vede nulla | Vede tutto in tempo reale |
| Debug | Difficile (lato server) | Facile (F12 nel browser) |
| Nuove API | Richiede mapping backend | Funziona subito |
| Errori | Crash silenzioso | Errore visibile in console |

---

## "API come Maestro"

Il pattern rimane valido: l'AI impara dagli errori delle API.

```
AI prova → API risponde errore chiaro → AI corregge → Riprova
```

Le API devono dare errori informativi:
```php
errorResponse("Tipo 'cantiere' non valido. Tipi disponibili: CANTIERE, IMPRESA, PERSONA");
```

---

## Implementazione

### Backend (chat.php)

```php
const WRITE_TOOLS = ['create_entity', 'update_entity', 'delete_entity', ...];

// Quando AI chiama un write tool:
if (isWriteTool($toolName)) {
    return [
        'status' => 'pending_action',
        'pending_action' => mapToolToFrontendAction($toolName, $args),
        'resume_context' => $conversationState
    ];
}
```

### Frontend (AiChat.tsx)

```typescript
while (continueLoop) {
    const response = await api.aiChat(message, history);

    if (response.status === 'pending_action') {
        // Esegui con le API del frontend
        const result = await executePendingAction(response.pending_action);
        // Continua la conversazione con il risultato
        resumeContext = { ...response.resume_context, _actionResult: result };
        continue;
    }
    break; // Risposta finale
}
```

---

## File Chiave

- `backend/api/ai/chat.php` - Logica AI + gestione pending_action
- `frontend/src/components/AiChat.tsx` - Loop esecuzione frontend
- `frontend/src/utils/api.ts` - Client API con tutti i metodi
- `backend/config/ai/prompt_base.txt` - System prompt AI

---

## Evoluzione Futura

1. **Preview**: mostrare anteprima prima di eseguire operazioni distruttive
2. **Batch**: l'AI può chiedere N operazioni, il frontend le esegue tutte
3. **Undo**: il frontend traccia le operazioni per poterle annullare
4. **Streaming**: mostrare il "pensiero" dell'AI in tempo reale
