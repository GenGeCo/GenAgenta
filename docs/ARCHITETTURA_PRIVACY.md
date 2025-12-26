# Architettura Privacy GenAgenta

## Concetto Base: Tre Layer di Sicurezza

GenAgenta ha **tre livelli di autenticazione**:

```
Layer 1: Login (email + password)
    ↓ accesso base all'app
Layer 2: Azienda (azienda_id nel token)
    ↓ vede solo dati della propria azienda
Layer 3: PIN Personale
    ↓ sblocca dati strettamente privati
```

## Due Modalità Operative

### Modalità Standard (dopo login)
- Accesso a dati aziendali condivisi
- Tutti i colleghi della stessa azienda vedono gli stessi dati
- Entità, transazioni, connessioni di lavoro

### Modalità Privata (dopo login + PIN)
- Sblocca dati personali del singolo utente
- NESSUN collega può vedere questi dati
- Valutazioni soggettive, note private, relazioni sensibili

## Esempio Pratico

**Mario** (commerciale) e **Lucia** (commerciale) lavorano per la stessa azienda.

| Dato | Livello | Chi vede |
|------|---------|----------|
| "Cantiere Roma Via Appia" | aziendale | Mario, Lucia, tutti i colleghi |
| "Vendita 5000€ a Cantiere Roma" | aziendale | Mario, Lucia, tutti i colleghi |
| "Il titolare di Toto è amico del capo" | personale (Mario) | SOLO Mario |
| "Influenza 5 stelle su Toto" | personale (Mario) | SOLO Mario |
| "Note: difficile da gestire" | personale (Lucia) | SOLO Lucia |

## Regole di Accesso Backend

### GET (Lettura)
```
SE livello = 'aziendale':
    VERIFICA azienda_id === user.azienda_id
SE livello = 'personale':
    VERIFICA personal_access === true (PIN inserito)
    VERIFICA creato_da === user.user_id
```

### UPDATE (Modifica)
```
SE livello = 'aziendale':
    VERIFICA azienda_id === user.azienda_id
SE livello = 'personale':
    VERIFICA personal_access === true (PIN inserito)
    VERIFICA creato_da === user.user_id  <-- CRITICO!
```

### DELETE (Cancellazione)
```
Stesse regole di UPDATE
```

## Token JWT

Il token contiene:
- `user_id`: ID utente
- `azienda_id`: ID azienda (per filtro dati aziendali)
- `team_id`: ID team
- `personal_access`: true/false (PIN verificato)

## GDPR Compliance

### Dati Aziendali (B2B)
- Persone giuridiche (P.IVA): NO GDPR per dati aziendali
- Professionisti con P.IVA (ingegneri, avvocati): considerati B2B
- Dati oggettivi transazionali: coperti da rapporto commerciale

### Dati Personali (sotto PIN)
- Valutazioni su persone fisiche: SONO dati personali GDPR
- Note soggettive: possono contenere dati sensibili
- Protezione: accesso esclusivo al creatore

### Perché è Sicuro
1. I dati sensibili (valutazioni) sono SEMPRE personali
2. I dati personali sono visibili SOLO al creatore
3. Il PIN aggiunge un layer di sicurezza extra
4. Nessun collega può vedere le valutazioni di altri colleghi

## File Coinvolti

### Backend API
- `neuroni/get.php` - Controllo lettura entità
- `neuroni/list.php` - Filtra lista entità
- `neuroni/update.php` - Controllo modifica entità
- `sinapsi/get.php` - Controllo lettura connessioni
- `sinapsi/list.php` - Filtra lista connessioni
- `sinapsi/update.php` - Controllo modifica connessioni

### Frontend
- `Dashboard.tsx` - Gestisce stato privacy mode
- `MapView.tsx` - Mostra/nasconde dati in base a livello
- Popup e pannelli dettaglio rispettano i controlli backend

## Checklist Sicurezza

- [x] GET neuroni: verifica azienda_id + creato_da
- [x] GET sinapsi: verifica azienda_id + creato_da
- [x] UPDATE sinapsi: verifica azienda_id + creato_da
- [x] UPDATE neuroni: verifica azienda_id + creato_da
- [x] DELETE neuroni: verifica azienda_id + creato_da
- [x] DELETE sinapsi: verifica azienda_id + creato_da

## Note Implementative

Le valutazioni soggettive (stelle) sulle connessioni sono salvate nella tabella `sinapsi`:
- `influenza` (1-5)
- `qualita_relazione` (1-5)
- `importanza_strategica` (1-5)
- `affidabilita` (1-5)
- `potenziale` (1-5)
- `note_relazione` (testo)

Questi campi sono modificabili SOLO dal creatore della sinapsi se il livello è 'personale'.
