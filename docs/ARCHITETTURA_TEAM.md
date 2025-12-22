# GenAgenta - Architettura Team e Multi-Utente

> Decisioni architetturali prese il 22/12/2024

---

## 1. PRINCIPIO FONDAMENTALE

**I DATI APPARTENGONO AL TEAM, NON ALL'UTENTE**

Ogni utente ha un team personale. Quando si unisce a un altro team, lavora in quel contesto.
I dati creati in un team restano in quel team, anche se l'utente esce.

---

## 2. FLUSSO REGISTRAZIONE

### Utente che si registra (nuovo)
1. Crea account con email/password
2. **Automaticamente** viene creato:
   - Un record in `aziende` (sistema legacy)
   - Un record in `team` (sistema v2)
   - Un record in `team_membri` (ruolo: responsabile)
3. L'utente diventa **admin/responsabile** del suo team
4. Può configurare tipi, tipologie, connessioni, ecc.

### Utente che si unisce a un team esistente
1. Si registra O è già registrato
2. Inserisce il **codice team** (es: GEA-X7K2M9)
3. Viene aggiunto a `team_membri` come **membro**
4. Eredita TUTTE le configurazioni del team (tipi, tipologie, ecc.)
5. Il suo team personale resta "congelato"

---

## 3. COSA SUCCEDE QUANDO UN MEMBRO ESCE

```
PRIMA: B è membro del Team A
       B ha creato "Cantiere Milano" nel Team A

DOPO:  B esce dal Team A
       → "Cantiere Milano" RESTA nel Team A
       → B torna al suo Team B personale (vuoto/congelato)
```

I dati non seguono l'utente. Restano nel team dove sono stati creati.

---

## 4. GERARCHIA DATI

```
TEAM
  └── Configurazioni (condivise da tutti i membri)
        ├── Tipi (Cantiere, Tecnico, Rivendita...)
        │     └── forma (quadrato, triangolo, cerchio...)
        ├── Tipologie (sottocategorie con colore)
        │     └── Villa, Palazzina, Architetto...
        └── Tipi Connessione
              └── Confermato, Probabile, Da verificare...
  └── Entità (visibilità: condiviso/privato)
        └── Cantiere Milano, Geom. Rossi, Rivendita XYZ...
  └── Connessioni (visibilità: condiviso/privato)
        └── Chi compra da chi, chi lavora per chi...
```

---

## 5. VISIBILITÀ DATI

| Tipo | Nel codice | Nell'UI | Chi vede |
|------|------------|---------|----------|
| Condiviso | `condiviso` | "Condiviso" | Tutti i membri del team |
| Privato | `privato` | "Privato" | Solo chi l'ha creato (richiede PIN) |

**Nota**: I dati privati appartengono comunque al team, ma sono visibili solo al creatore.

---

## 6. STRUTTURA DATABASE

### Tabelle principali (v2)

```sql
team                -- I team
team_membri         -- Chi appartiene a quale team
tipi                -- Tipi entità (per team)
tipologie           -- Sottocategorie (per tipo)
tipi_connessione    -- Tipi di relazione (per team)
entita              -- Le entità sulla mappa (per team)
connessioni         -- I legami tra entità (per team)
```

### Relazioni chiave

```
team (1) ──────< (N) team_membri >────── (1) utenti
team (1) ──────< (N) tipi
tipi (1) ──────< (N) tipologie
team (1) ──────< (N) tipi_connessione
team (1) ──────< (N) entita
team (1) ──────< (N) connessioni
```

---

## 7. TOKEN JWT

Il token JWT ora include `team_id`:

```json
{
  "user_id": "uuid",
  "azienda_id": "uuid",
  "team_id": "uuid",
  "email": "...",
  "nome": "...",
  "ruolo": "commerciale",
  "ruolo_azienda": "admin|membro"
}
```

Le API v2 usano `team_id` per filtrare i dati.

---

## 8. API v2

Nuovi endpoint in `/backend/api_v2/`:

| Endpoint | Descrizione |
|----------|-------------|
| `/tipi` | CRUD tipi entità |
| `/tipologie` | CRUD tipologie |
| `/tipi-connessione` | CRUD tipi connessione |
| `/entita` | CRUD entità |
| `/connessioni` | CRUD connessioni |
| `/campi` | Campi personalizzati per tipo |

Tutti filtrano per `team_id` dell'utente loggato.

---

## 9. MIGRAZIONE UTENTI ESISTENTI

Script: `database/migration_011_create_teams_for_existing_users.sql`

Crea record in `team` e `team_membri` per utenti che esistevano prima di questa modifica.

---

## 10. DOMANDE FUTURE

1. **Multi-team**: Un utente può essere membro di più team contemporaneamente?
   - Attualmente: NO (un team alla volta)
   - Futuro: Possibile, con switch team nell'UI

2. **Trasferimento dati**: Un admin può trasferire entità a un altro team?
   - Attualmente: NO
   - Futuro: Funzionalità export/import

3. **Permessi granulari**: I membri possono avere permessi diversi?
   - Attualmente: Solo admin/membro
   - Futuro: Possibile (es: sola lettura, modifica, ecc.)

---

*Documento creato: 22/12/2024*
*Versione: 1.0*
