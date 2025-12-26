# Struttura Dati Connessioni (Sinapsi)

## Filosofia

Le connessioni tra entità hanno **due tipi di dati**:

### 1. Dati Oggettivi (Auto-calcolati)
Derivano automaticamente dalle transazioni registrate. Non si salvano nella tabella `sinapsi` ma si calcolano al volo con JOIN.

| Campo | Descrizione | Query |
|-------|-------------|-------|
| `volume_totale` | Somma € vendite tra le due entità | `SUM(vendite.importo)` |
| `numero_transazioni` | Conteggio vendite | `COUNT(vendite.id)` |
| `ultima_transazione` | Data più recente | `MAX(vendite.data_vendita)` |
| `prima_transazione` | Data più vecchia | `MIN(vendite.data_vendita)` |

**Query esempio:**
```sql
SELECT
  s.*,
  COALESCE(SUM(v.importo), 0) as volume_totale,
  COUNT(v.id) as numero_transazioni,
  MAX(v.data_vendita) as ultima_transazione
FROM sinapsi s
LEFT JOIN vendite v ON (
  (v.venditore_id = s.neurone_da AND v.cliente_id = s.neurone_a)
  OR (v.venditore_id = s.neurone_a AND v.cliente_id = s.neurone_da)
)
WHERE s.id = ?
GROUP BY s.id
```

### 2. Dati Soggettivi (Inseriti dall'utente)
Valutazioni qualitative del commerciale. Si salvano nella tabella `sinapsi`.

| Campo | Tipo | Range | Descrizione |
|-------|------|-------|-------------|
| `influenza` | TINYINT | 1-5 | Quanto A influenza le decisioni di B |
| `qualita_relazione` | TINYINT | 1-5 | Solidità del rapporto (fiducia, storicità) |
| `importanza_strategica` | TINYINT | 1-5 | Valore strategico (porta altri clienti, settore chiave) |
| `affidabilita` | TINYINT | 1-5 | Puntualità pagamenti, rispetto impegni |
| `potenziale` | TINYINT | 1-5 | Margine di crescita futuro |
| `note_relazione` | TEXT | - | Note libere sulla relazione |

## Direzione delle Connessioni

Alcune connessioni sono **direzionali** (A → B), altre **simmetriche** (A ↔ B).

| Tipo Connessione | Direzionale? | Significato direzione |
|------------------|--------------|----------------------|
| `influencer` | Sì | A influenza B |
| `fornitore` | Sì | A fornisce a B |
| `cliente` | Sì | A è cliente di B |
| `tecnico` | Sì | A è tecnico di riferimento per B |
| `commerciale` | No | A e B hanno rapporto commerciale |
| `partner` | No | A e B sono partner |
| `collaborazione` | No | A e B collaborano |
| `conoscenza` | No | A e B si conoscono |

## Visualizzazione

### Nel Popup Connessione (hover)
- Tipo connessione
- Nomi entità (con freccia se direzionale)
- Certezza (certo/probabile/ipotetico)

### Nel Popup Dettagliato (click)
**Sezione Oggettiva:**
- Volume totale transazioni
- Numero transazioni
- Ultima transazione

**Sezione Soggettiva:**
- 5 stelline per ogni campo (influenza, qualità, ecc.)
- Note relazione

## Schema Database

```sql
-- Campi soggettivi da aggiungere a sinapsi
ALTER TABLE sinapsi ADD COLUMN influenza TINYINT NULL;
ALTER TABLE sinapsi ADD COLUMN qualita_relazione TINYINT NULL;
ALTER TABLE sinapsi ADD COLUMN importanza_strategica TINYINT NULL;
ALTER TABLE sinapsi ADD COLUMN affidabilita TINYINT NULL;
ALTER TABLE sinapsi ADD COLUMN potenziale TINYINT NULL;
ALTER TABLE sinapsi ADD COLUMN note_relazione TEXT NULL;

-- Flag direzionale sui tipi (opzionale, si può hardcodare)
ALTER TABLE tipi_sinapsi ADD COLUMN direzionale BOOLEAN DEFAULT FALSE;
```

## API

### GET /sinapsi/{id}
Ritorna tutti i dati della connessione, inclusi quelli oggettivi calcolati.

### PUT /sinapsi/{id}
Aggiorna i campi soggettivi:
```json
{
  "influenza": 4,
  "qualita_relazione": 5,
  "importanza_strategica": 3,
  "affidabilita": 5,
  "potenziale": 2,
  "note_relazione": "Cliente storico, molto affidabile"
}
```

## Interpretazione Valori

### Influenza (1-5)
1. Nessuna influenza
2. Poca influenza
3. Influenza moderata
4. Influenza significativa
5. Influenza determinante

### Qualità Relazione (1-5)
1. Rapporto freddo/problematico
2. Rapporto formale
3. Rapporto buono
4. Rapporto consolidato
5. Rapporto eccellente/fiducia totale

### Importanza Strategica (1-5)
1. Cliente occasionale
2. Cliente regolare
3. Cliente importante
4. Cliente strategico
5. Cliente chiave/irrinunciabile

### Affidabilità (1-5)
1. Inaffidabile (ritardi, problemi)
2. Poco affidabile
3. Nella norma
4. Affidabile
5. Eccellente (sempre puntuale)

### Potenziale (1-5)
1. Nessun potenziale di crescita
2. Poco potenziale
3. Potenziale moderato
4. Buon potenziale
5. Alto potenziale (grandi opportunità)
