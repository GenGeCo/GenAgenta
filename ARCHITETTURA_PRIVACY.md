# Architettura Privacy e Multi-Utente

## Il Concetto: Due Livelli di Visibilità

GenAgenta è progettato con **due livelli di privacy** distinti, necessari per rispettare il GDPR e le esigenze operative:

```
┌─────────────────────────────────────────────────────────────────┐
│                         GENAGENTA                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              LIVELLO AZIENDALE (Condiviso)              │   │
│   │                                                         │   │
│   │  • Professionisti (tecnici, architetti, geometri)       │   │
│   │  • Imprese (colorifici, imprese edili, studi)          │   │
│   │  • Cantieri e luoghi                                    │   │
│   │  • Relazioni commerciali verificabili                   │   │
│   │                                                         │   │
│   │  👥 Visibile a TUTTI i colleghi della stessa azienda   │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              LIVELLO PERSONALE (Privato)                │   │
│   │                                                         │   │
│   │  • Contatti personali e fonti informali                │   │
│   │  • Appunti e note riservate                            │   │
│   │  • Relazioni non ufficiali                             │   │
│   │  • Qualsiasi informazione sensibile                    │   │
│   │                                                         │   │
│   │  🔒 Visibile SOLO a te, protetto da PIN                │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Perché Questo Design

### Conformità GDPR
- I **dati personali** (nomi di persone fisiche, contatti privati) non possono essere condivisi liberamente
- Ogni utente è responsabile dei propri dati personali
- I dati aziendali (imprese, P.IVA, cantieri) sono informazioni commerciali condivisibili

### Operatività Commerciale
- Un commerciale in giro vede un cantiere nuovo → lo inserisce → tutti i colleghi lo vedono
- Un commerciale ha un contatto personale riservato → lo inserisce nel livello privato → solo lui lo vede

### Separazione Responsabilità
- **Dati aziendali**: responsabilità condivisa, audit aziendale
- **Dati personali**: responsabilità individuale, come un'agenda privata

---

## Struttura Dati Attuale

### Tabella `neuroni`
```sql
visibilita ENUM('aziendale', 'personale') DEFAULT 'aziendale'
creato_da CHAR(36)  -- Chi ha creato il neurone
```

### Tabella `sinapsi`
```sql
livello ENUM('aziendale', 'personale') DEFAULT 'aziendale'
creato_da CHAR(36)  -- Chi ha creato la connessione
```

### Tabella `note_personali`
```sql
utente_id CHAR(36)  -- Sempre legate all'utente, sempre private
neurone_id CHAR(36) -- Note su qualsiasi neurone
```

### Tabella `utenti`
```sql
pin_hash VARCHAR(255)  -- PIN per sbloccare area personale
```

---

## Flusso di Autenticazione

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│              │     │              │     │                      │
│    LOGIN     │────▶│   TOKEN JWT  │────▶│  Accesso Aziendale   │
│  (email+pwd) │     │   (base)     │     │  (neuroni aziendali) │
│              │     │              │     │                      │
└──────────────┘     └──────────────┘     └──────────────────────┘
                            │
                            │ + PIN
                            ▼
                     ┌──────────────┐     ┌──────────────────────┐
                     │              │     │                      │
                     │  TOKEN JWT   │────▶│  Accesso Completo    │
                     │ (personal)   │     │  (tutto + personale) │
                     │              │     │                      │
                     └──────────────┘     └──────────────────────┘
```

Il token con `personal_access: true` scade dopo **1 ora**, poi serve reinserire il PIN.

---

## Stato Implementazione Attuale

### ✅ Funzionante
- [x] Campo `visibilita` su neuroni
- [x] Campo `livello` su sinapsi
- [x] Tabella `note_personali` separata
- [x] Sistema PIN con verifica
- [x] Token JWT con flag `personal_access`
- [x] Filtro base in `neuroni/list.php`

### ❌ Problemi Critici

#### 1. Manca il concetto di "Azienda"
```
ATTUALE:
utenti ──────────────────▶ neuroni (aziendali)
                           (TUTTI vedono TUTTO)

NECESSARIO:
utenti ── azienda_id ────▶ neuroni (aziendali)
                           (Solo stessa azienda)
```

La tabella `utenti` non ha un `azienda_id`. Questo significa che:
- Tutti gli utenti registrati vedono tutti i dati "aziendali"
- Non c'è separazione tra aziende diverse
- Un concorrente potrebbe registrarsi e vedere tutto

#### 2. Dati personali non filtrati per proprietario
```php
// ATTUALE (SBAGLIATO):
if (!$hasPersonalAccess) {
    $where[] = "visibilita = 'aziendale'";
}
// Se hai PIN, vedi TUTTI i neuroni personali di TUTTI gli utenti!

// CORRETTO:
if (!$hasPersonalAccess) {
    $where[] = "visibilita = 'aziendale'";
} else {
    $where[] = "(visibilita = 'aziendale' OR creato_da = ?)";
    $params[] = $user['user_id'];
}
```

#### 3. Manca gestione multi-utente
- No registrazione nuovi utenti
- No creazione aziende
- No sistema invito colleghi
- No gestione ruoli per azienda

---

## Architettura Target

### Nuova Tabella `aziende`
```sql
CREATE TABLE aziende (
    id CHAR(36) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    codice_invito CHAR(8) UNIQUE,  -- Per invitare colleghi
    piano ENUM('free', 'pro', 'enterprise') DEFAULT 'free',
    max_utenti INT DEFAULT 3,
    attiva TINYINT(1) DEFAULT 1,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Modifica Tabella `utenti`
```sql
ALTER TABLE utenti
ADD COLUMN azienda_id CHAR(36),
ADD COLUMN ruolo_azienda ENUM('admin', 'membro') DEFAULT 'membro',
ADD FOREIGN KEY (azienda_id) REFERENCES aziende(id);
```

### Modifica Tabella `neuroni`
```sql
ALTER TABLE neuroni
ADD COLUMN azienda_id CHAR(36),
ADD FOREIGN KEY (azienda_id) REFERENCES aziende(id);
```

### Modifica Tabella `sinapsi`
```sql
ALTER TABLE sinapsi
ADD COLUMN azienda_id CHAR(36),
ADD FOREIGN KEY (azienda_id) REFERENCES aziende(id);
```

---

## Logica di Accesso Target

### Neuroni
```
SE visibilita = 'aziendale':
    Mostra SE neurone.azienda_id = utente.azienda_id

SE visibilita = 'personale':
    Mostra SE neurone.creato_da = utente.id E utente ha personal_access
```

### Sinapsi
```
SE livello = 'aziendale':
    Mostra SE sinapsi.azienda_id = utente.azienda_id

SE livello = 'personale':
    Mostra SE sinapsi.creato_da = utente.id E utente ha personal_access
```

### Note Personali
```
Mostra SEMPRE E SOLO SE nota.utente_id = utente.id E utente ha personal_access
```

---

## Flussi Utente da Implementare

### Registrazione Nuova Azienda
```
1. Utente si registra con email
2. Sistema crea nuova azienda
3. Utente diventa admin dell'azienda
4. Genera codice invito per colleghi
```

### Invito Colleghi
```
1. Admin condivide codice invito (es: "GECO2024")
2. Collega si registra inserendo il codice
3. Sistema associa collega alla stessa azienda
4. Collega vede tutti i dati aziendali
```

### Configurazione PIN
```
1. Utente accede alle impostazioni
2. Imposta PIN a 4-6 cifre
3. Da ora può creare/vedere dati personali
```

---

## Priorità Implementazione

### Fase 1: Fix Sicurezza (URGENTE)
1. Aggiungere filtro `creato_da` per dati personali
2. Impedire registrazioni non autorizzate (se non già fatto)

### Fase 2: Multi-Azienda
1. Creare tabella `aziende`
2. Aggiungere `azienda_id` a utenti/neuroni/sinapsi
3. Implementare filtri per azienda

### Fase 3: Gestione Utenti
1. Registrazione con creazione azienda
2. Sistema codice invito
3. Gestione ruoli (admin/membro)

### Fase 4: UX Completa
1. Interfaccia impostazione PIN
2. Interfaccia invito colleghi
3. Pannello admin azienda

---

## Note Tecniche

### Token JWT Attuale
```json
{
    "user_id": "uuid",
    "email": "...",
    "nome": "...",
    "ruolo": "admin|commerciale",
    "personal_access": true|false,
    "personal_exp": 1234567890
}
```

### Token JWT Target
```json
{
    "user_id": "uuid",
    "azienda_id": "uuid",        // NUOVO
    "email": "...",
    "nome": "...",
    "ruolo": "admin|commerciale",
    "ruolo_azienda": "admin|membro",  // NUOVO
    "personal_access": true|false,
    "personal_exp": 1234567890
}
```

---

## Riferimenti File

- Schema DB: [database/schema.sql](database/schema.sql)
- Auth Login: [backend/api/auth/login.php](backend/api/auth/login.php)
- Auth PIN: [backend/api/auth/verify-pin.php](backend/api/auth/verify-pin.php)
- Lista Neuroni: [backend/api/neuroni/list.php](backend/api/neuroni/list.php)
- Note Personali: [backend/api/note/list.php](backend/api/note/list.php)
