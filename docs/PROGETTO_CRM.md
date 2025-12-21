# GenAgenta - Progetto CRM Evoluto

## Visione
Sistema CRM con visualizzazione 3D delle relazioni commerciali. Non solo "chi conosce chi" ma "chi compra cosa, da chi, quando, e perché".

---

## 1. ARCHITETTURA ENTITÀ (Neuroni)

### 1.1 Struttura Attuale
- **Tipi Neurone**: persona, impresa, luogo (forma del marker)
- **Categorie**: cartongessista, pittore, ecc. (colore del marker)
- **Dati fissi**: nome, email, telefono, indirizzo, coordinate

### 1.2 Evoluzione Proposta: Campi Personalizzabili

Ogni **Tipo Neurone** può avere campi custom definiti dall'utente.

```
Esempio "Impresa":
├── Ragione sociale (testo) [default]
├── P.IVA (testo)
├── Fatturato annuo (numero)
├── N. dipendenti (numero)
├── Settore (selezione multipla)
└── Note interne (testo lungo)

Esempio "Persona":
├── Nome completo (testo) [default]
├── Ruolo in azienda (testo)
├── Decisore? (sì/no)
├── Budget gestito (numero)
└── Preferenze contatto (selezione: telefono/email/whatsapp)
```

**Database: Nuova tabella `campi_custom`**
```sql
CREATE TABLE campi_custom (
    id VARCHAR(36) PRIMARY KEY,
    tipo_neurone_id VARCHAR(36) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    etichetta VARCHAR(100) NOT NULL,
    tipo_campo ENUM('testo', 'numero', 'data', 'booleano', 'selezione', 'selezione_multipla', 'testo_lungo') NOT NULL,
    opzioni JSON, -- per selezione/selezione_multipla
    obbligatorio BOOLEAN DEFAULT FALSE,
    ordine INT DEFAULT 0,
    visibilita ENUM('aziendale', 'personale') DEFAULT 'aziendale',
    azienda_id VARCHAR(36),
    creato_da VARCHAR(36),
    FOREIGN KEY (tipo_neurone_id) REFERENCES tipi_neurone(id)
);

-- I valori vanno in dati_extra del neurone (già esiste come JSON)
```

---

## 2. CONNESSIONI (Sinapsi) - Architettura Completa

### 2.1 Struttura Attuale
- neurone_da → neurone_a
- tipo_relazione: "collabora", "conosce", ecc.
- valore, certezza
- data_inizio

### 2.2 Evoluzione Proposta

```
Sinapsi Completa:
├── Chi → Chi (neuroni collegati)
├── Tipo relazione (personalizzabile)
├── Data inizio
├── Data fine (nullable = ancora attiva)
├── Stato: attiva / conclusa / in pausa
├── Motivazione/Interesse (cosa li lega?)
│   └── es: "cartongesso", "pitture", "ristrutturazioni"
├── Direzione commerciale
│   └── A vende a B / B compra da A / collaborazione paritaria
├── Valore economico stimato (annuo/totale)
├── Frequenza contatti (settimanale/mensile/annuale)
└── Note
```

**Database: Modifica tabella `sinapsi`**
```sql
ALTER TABLE sinapsi ADD COLUMN data_fine DATE;
ALTER TABLE sinapsi ADD COLUMN stato ENUM('attiva', 'conclusa', 'in_pausa') DEFAULT 'attiva';
ALTER TABLE sinapsi ADD COLUMN interessi JSON; -- ["cartongesso", "pitture"]
ALTER TABLE sinapsi ADD COLUMN direzione ENUM('a_vende_b', 'b_vende_a', 'collaborazione', 'altro') DEFAULT 'altro';
ALTER TABLE sinapsi ADD COLUMN frequenza_contatti ENUM('giornaliera', 'settimanale', 'mensile', 'trimestrale', 'annuale', 'occasionale');
ALTER TABLE sinapsi ADD COLUMN note TEXT;
```

---

## 3. ACQUISTI - Nuovo Modulo

### 3.1 Concetto
Tracciare **cosa compra** ogni contatto. Non singole fatture, ma categorie di prodotti/servizi.

```
Mario Cartongessista:
├── Compra: Lastre cartongesso ✓
├── Compra: Profili metallici ✓
├── Compra: Stucco ✗ (non compra)
├── Compra: Viti ✓
└── Compra: Nastro carta ✓

Parrucchiera Anna:
├── Compra: Gel ✓
├── Compra: Lacca ✗
├── Compra: Shampoo professionale ✓
└── Compra: Tinte ✓
```

### 3.2 Database: Nuove Tabelle

```sql
-- Categorie prodotto (definite dall'utente)
CREATE TABLE categorie_prodotto (
    id VARCHAR(36) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descrizione TEXT,
    gruppo VARCHAR(100), -- per raggruppare: "Edilizia", "Parrucchiere", ecc.
    visibilita ENUM('aziendale', 'personale') DEFAULT 'aziendale',
    azienda_id VARCHAR(36),
    creato_da VARCHAR(36)
);

-- Cosa compra ogni neurone
CREATE TABLE acquisti_neurone (
    id VARCHAR(36) PRIMARY KEY,
    neurone_id VARCHAR(36) NOT NULL,
    categoria_prodotto_id VARCHAR(36) NOT NULL,
    compra BOOLEAN DEFAULT TRUE, -- TRUE = compra, FALSE = esplicitamente NON compra
    frequenza ENUM('mai', 'raramente', 'occasionalmente', 'regolarmente', 'frequentemente'),
    volume_stimato VARCHAR(50), -- "50 lastre/mese", "200€/mese"
    fornitore_preferito VARCHAR(36), -- riferimento a altro neurone
    note TEXT,
    ultimo_aggiornamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    visibilita ENUM('aziendale', 'personale') DEFAULT 'aziendale',
    azienda_id VARCHAR(36),
    creato_da VARCHAR(36),
    FOREIGN KEY (neurone_id) REFERENCES neuroni(id),
    FOREIGN KEY (categoria_prodotto_id) REFERENCES categorie_prodotto(id)
);
```

### 3.3 UI Proposta
Nel pannello dettaglio neurone, nuova tab "Acquisti":
- Griglia con tutte le categorie prodotto
- Checkbox ✓/✗ per ogni categoria
- Click su categoria per dettagli (frequenza, volume, note)
- Filtro rapido: "Mostra solo chi compra [categoria]"

---

## 4. IMPORT/EXPORT EXCEL

### 4.1 Export
- Esporta tutti i neuroni con tutti i campi (inclusi custom)
- Esporta sinapsi
- Esporta acquisti
- Formato: .xlsx con fogli separati

### 4.2 Import
- Template scaricabile precompilato
- Mapping colonne automatico (best-effort) + manuale
- Preview prima dell'import
- Gestione duplicati:
  - Salta
  - Sovrascrivi
  - Crea nuovo
- Log errori dettagliato

### 4.3 Librerie
- Backend: PhpSpreadsheet
- Frontend: xlsx.js (per preview client-side)

---

## 5. UI/UX - Pagina Impostazioni Dedicata

### 5.1 Struttura Proposta

Invece del modal, pagina `/impostazioni` con sidebar:

```
Impostazioni
├── Tipi Neurone
│   ├── Lista tipi esistenti
│   ├── Crea nuovo tipo
│   └── Per ogni tipo: gestisci campi custom
├── Categorie
│   ├── Lista categorie
│   └── Crea/modifica categoria
├── Tipi Connessione
│   ├── Lista tipi relazione
│   └── Crea/modifica tipo
├── Categorie Prodotto
│   ├── Lista categorie prodotto
│   ├── Raggruppamenti
│   └── Crea/modifica categoria
├── Import/Export
│   ├── Esporta dati
│   ├── Importa da Excel
│   └── Storico import
└── Gestione Utenti (solo admin)
    ├── Invita colleghi
    └── Gestisci permessi
```

---

## 6. PRIORITÀ IMPLEMENTAZIONE

### Fase 1 - Fondamenta (Priorità Alta)
1. ✅ Tipi neurone personalizzabili (FATTO)
2. ✅ Categorie personalizzabili (FATTO)
3. ✅ Colori dinamici mappa (FATTO)
4. 🔲 Form creazione sinapsi nel pannello dettaglio
5. 🔲 Tipi sinapsi personalizzabili (backend pronto, manca frontend)

### Fase 2 - Profondità Relazioni
6. 🔲 Campi aggiuntivi sinapsi (data fine, stato, direzione)
7. 🔲 Interessi/motivazioni nelle sinapsi
8. 🔲 Visualizzazione connessioni con più info

### Fase 3 - Modulo Acquisti
9. 🔲 Categorie prodotto
10. 🔲 Tabella acquisti_neurone
11. 🔲 UI acquisti nel pannello dettaglio
12. 🔲 Filtri: "chi compra X"

### Fase 4 - Campi Custom
13. 🔲 Tabella campi_custom
14. 🔲 UI definizione campi per tipo
15. 🔲 Rendering dinamico form neurone
16. 🔲 Salvataggio in dati_extra

### Fase 5 - Import/Export
17. 🔲 Export Excel completo
18. 🔲 Template import
19. 🔲 Import con mapping
20. 🔲 Gestione duplicati

### Fase 6 - Pagina Impostazioni
21. 🔲 Nuova route /impostazioni
22. 🔲 Migrazione da modal a pagina
23. 🔲 UI unificata gestione entità

---

## 7. NOTE TECNICHE

### Stack Attuale
- **Frontend**: React + TypeScript + Vite
- **Mappa**: Mapbox GL JS (3D)
- **Backend**: PHP 8+ REST API
- **Database**: MySQL/MariaDB
- **Auth**: JWT con PIN per dati personali

### Convenzioni
- UUID per tutti gli ID
- Visibilità: aziendale (tutti in azienda) / personale (solo con PIN)
- JSON per dati flessibili (dati_extra, opzioni)
- API RESTful: GET/POST/PUT/DELETE

---

## 8. DOMANDE APERTE

1. **Prodotti vs Servizi**: Le categorie prodotto includono anche servizi? (es: "Posa cartongesso" oltre a "Lastre cartongesso")

2. **Storico acquisti**: Tracciamo solo "compra/non compra" attuale o anche storico? (es: "comprava gel fino al 2023, ora non più")

3. **Quantità/Valori**: Quanto dettaglio serve? Solo "compra regolarmente" o anche "50 lastre/mese per 500€"?

4. **Multi-fornitore**: Un contatto può comprare la stessa categoria da più fornitori?

5. **Obiettivi commerciali**: Serve tracciare "potenziale cliente per categoria X" (non compra ancora ma potrebbe)?

---

*Documento creato: 21/12/2024*
*Versione: 1.0*
