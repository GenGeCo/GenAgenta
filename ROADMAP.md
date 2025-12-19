# GenAgenTa - Roadmap e Decisioni Fisse

## Stato Progetto
**Ultimo aggiornamento:** 2025-12-19
**Fase attuale:** Definizione architettura

---

## Il Concetto Centrale

**GenAgenTa è una RETE NEURALE TEMPORALE delle relazioni commerciali.**

Non è un CRM classico. È una mappa di relazioni che vive nel tempo:
- **Neuroni** = Entità (persone, imprese, cantieri)
- **Sinapsi** = Connessioni tra entità (con data inizio/fine, valore, certezza)
- **Tempo** = Slider per vedere l'evoluzione della rete

```
        TEMPO (slider trascinabile)
          │
    ══════●═══════════════●══════════════════►
    Gen 2024        Set 2024              Oggi
          └───────────────┘
           PERIODO VISUALIZZATO

    La mappa mostra solo le connessioni ATTIVE nel periodo selezionato
```

---

## Decisioni Confermate

### Hosting & Infrastruttura
- **Hosting:** Netsons (condiviso cPanel)
- **Dominio:** gruppogea.net
- **URL App:** www.gruppogea.net/genagenta/
- **PHP:** 8.3.27 (con Zend OPcache)
- **Database:** MariaDB 10.6.23
- **Composer:** 2.6.5
- **Git:** 2.48.2
- **Node.js:** Non presente su server (build React in locale)
- **Deploy:** Git Version Control cPanel (pull da GitHub)
- **SSH Terminal:** Disponibile

### Stack Tecnologico

#### Backend
- **Linguaggio:** PHP 8.3
- **Database:** MariaDB/MySQL
- **Architettura:** API REST

#### Frontend
- **Framework:** React + TypeScript
- **Build:** Vite
- **Mappa 3D:** Mapbox GL JS
- **Grafo:** Cytoscape.js

---

## Modello Dati: Neuroni e Sinapsi

### NEURONI (Entità)

Ogni neurone ha:
- `id` (UUID)
- `tipo` (vedi categorie sotto)
- `nome`
- `coordinate` (lat, lng) - per posizione su mappa
- `contatti` (telefono, email, indirizzo)
- `dati_specifici` (JSON flessibile per dati extra)
- `data_creazione`
- `data_modifica`

#### Categorie di Neuroni (tipo)

**PERSONE:**
- `imbianchino` / `pittore`
- `cartongessista`
- `muratore`
- `impiantista`
- `idraulico`
- `elettricista`
- `movimento_terra`
- `giardiniere` / `verde`
- `carpentiere`
- `piastrellista`
- `tecnico` (geometra, architetto, ingegnere)
- `amministratore_condominio`
- `agente_immobiliare`
- `rappresentante` (agente di commercio per marche/produttori)
- `commerciale`
- `altro`

**NOTA:** Una persona può avere PIÙ categorie (es: muratore + cartongessista)

**IMPRESE:**
- `impresa_edile`
- `studio_tecnico`
- `amministrazione_condomini`
- `agenzia_immobiliare`
- `colorificio` / `rivendita_materiali`
- `ferramenta`
- `noleggio_attrezzature`
- `marca` / `produttore` (es: Weber, Mapei, San Marco, Caparol...)
- `altro`

**LUOGHI:**
- `cantiere`
- `condominio`

### SINAPSI (Connessioni)

Ogni sinapsi collega due neuroni e ha:

```
{
  id: UUID,
  neurone_da: UUID,
  neurone_a: UUID,
  tipo_connessione: string,
  data_inizio: date,
  data_fine: date | null,      // null = ancora attiva
  valore: number | null,        // per spessore linea (€)
  certezza: "certo" | "probabile" | "ipotesi",
  note: string,
  livello: "aziendale" | "personale"  // visibilità
}
```

#### Tipi di Connessione (tipo_connessione)

**Cantiere ↔ Persona/Impresa:**
- `progetta` - progettista del cantiere
- `dirige_lavori` - direttore lavori
- `costruisce` - impresa principale
- `subappalta` - subappaltatore
- `fornisce` - fornitore materiali
- `applica_pittura` - imbianchino
- `applica_cartongesso` - cartongessista
- `applica_piastrelle` - piastrellista
- `impianto_elettrico` - elettricista
- `impianto_idraulico` - idraulico
- `movimento_terra` - escavatorista
- `verde` - giardiniere
- `commissiona` - committente
- `amministra` - amministratore condominio
- `segnala` - chi ha segnalato il cantiere (PERSONALE)
- `preventivo_fatto` - ha fatto preventivo
- `preventivo_accettato` - preventivo accettato
- `preventivo_rifiutato` - preventivo non accettato

**Persona ↔ Impresa:**
- `lavora_per`
- `titolare_di`
- `collabora_con`
- `dipendente_di`

**Impresa ↔ Impresa / Persona ↔ Impresa:**
- `compra_da` - acquisti (con valore)
- `vende_a` - vendite (con valore)
- `subappalta_a`
- `partner`
- `consiglia` - "vai da questo fornitore" (PERSONALE)

**Persona ↔ Persona:**
- `conosce`
- `collabora_con`
- `segnalato_da` (PERSONALE)
- `parente_di` (PERSONALE)
- `amico_di` (PERSONALE)

**Rappresentante ↔ Marca/Produttore:**
- `rappresenta` - il rappresentante lavora per questa marca

**Rappresentante ↔ Altri (tecnici, imprese, rivendite, pittori):**
- `visita` - il rappresentante visita regolarmente questo soggetto
- `segue_zona` - il rappresentante copre questa zona/questi clienti

**Marca ↔ Cantiere/Persona:**
- `usa_prodotto` - questo cantiere/pittore usa prodotti di questa marca
- `consiglia_marca` - questo tecnico consiglia questa marca (con nota prodotto specifico)
- `venduto_tramite` - la marca è stata venduta tramite questo colorificio/rivendita

---

## Due Livelli di Visibilità

### Livello AZIENDALE (dopo login)
- Tutti i dati professionali
- Contatti, indirizzi, email, telefono
- Cantieri, ruoli, fatturati
- Connessioni di lavoro
- **NON visibili:** note personali, connessioni private, neuroni privati

### Livello PERSONALE (dopo PIN)
- Tutto il livello aziendale PLUS:
- Note personali su qualsiasi neurone
- Connessioni private (segnalato_da, amico_di, parente_di...)
- Neuroni completamente privati (es: "Signora Maria")
- Supposizioni e ipotesi

### Come funziona

**Ogni neurone ha un campo `visibilita`:**
- `aziendale` - visibile dopo login (default)
- `personale` - visibile solo dopo PIN

**Ogni sinapsi ha un campo `livello`:**
- `aziendale` - connessione di lavoro, visibile dopo login
- `personale` - connessione privata, visibile solo dopo PIN

**Note personali:**
- Possibili su QUALSIASI neurone (anche quelli aziendali)
- Sempre protette da PIN
- Es: "Arch. Rossi" è aziendale, ma la nota "amico di Giovanni" richiede PIN

**Visualizzazione SENZA PIN:**
- Neuroni personali → "Fonte anonima #1" (grigio)
- Connessioni personali → linea tratteggiata grigia, senza etichetta
- Icona lucchetto sui neuroni che hanno note nascoste

**Visualizzazione CON PIN:**
- Tutto visibile con nomi e dettagli
- Colore diverso per distinguere dati personali

---

## Interfaccia Utente

### Vista Mappa 3D
- Neuroni geolocalizzati come forme 3D
- Cilindri = Imprese
- Cubi = Cantieri
- Sfere = Persone
- Altezza = Fatturato/importanza nel periodo
- Linee = Sinapsi (spessore = valore)
- Click su neurone → pannello dettaglio + opzione "vedi connessioni"

### Vista Grafo
- Rete neurale visuale
- Centrata su un nodo scelto
- Espandibile (click su nodo → mostra sue connessioni)
- Filtri per tipo, periodo, valore

### Slider Temporale
```
◄────────────●═══════════════●────────────────►
Gen 2023     Mar 2024        Dic 2024      Oggi
             └───────────────┘
              RANGE SELEZIONATO
```
- Trascinabile
- Selezione range (da-a)
- La mappa si aggiorna in tempo reale
- Connessioni fuori range → spariscono o fantasma

### Filtri Globali
- Periodo (via slider)
- Tipo neurone (impresa, persona, cantiere)
- Categoria (imbianchino, tecnico, ecc.)
- Soglia valore minimo
- Zona geografica (raggio da punto)
- Certezza (certo/probabile/ipotesi)

### Pannello Dettaglio Neurone
Click su un neurone mostra:
- Dati anagrafici
- Lista connessioni attive (nel periodo)
- Storico connessioni
- Totale fatturato nel periodo
- Icona lucchetto se ci sono note personali
- Pulsante "Centra grafo su questo"

**Tab speciali per tipo neurone:**

*Per CANTIERE:*
- Tab "Soggetti coinvolti" (imprese, tecnici, operai)
- Tab "Prodotti/Marche" (cosa è stato usato, di che marca, venduto da chi)
- Tab "Catena commerciale" (marca → rappresentante → rivendita → cantiere)

*Per RAPPRESENTANTE:*
- Tab "Marca rappresentata"
- Tab "Clienti visitati" (tecnici, imprese, rivendite)
- Tab "Cantieri raggiunti" (dove i suoi prodotti sono finiti)

*Per MARCA:*
- Tab "Rappresentanti"
- Tab "Rivendite che vendono"
- Tab "Tecnici che consigliano"
- Tab "Cantieri dove è stata usata"

---

## Funzionalità MVP

### Fase 1: Setup
- [ ] Repository GitHub
- [ ] Struttura progetto
- [ ] Database MariaDB
- [ ] Deploy Git → cPanel

### Fase 2: Backend PHP
- [ ] API CRUD neuroni
- [ ] API CRUD sinapsi
- [ ] API filtri (periodo, tipo, zona)
- [ ] Autenticazione (login)
- [ ] Protezione area personale (PIN)

### Fase 3: Frontend Base
- [ ] React + Vite + TypeScript
- [ ] Layout responsive
- [ ] Login
- [ ] Navigazione

### Fase 4: Mappa 3D
- [ ] Mapbox GL JS
- [ ] Neuroni come forme 3D
- [ ] Sinapsi come linee
- [ ] Click → dettaglio
- [ ] Filtri

### Fase 5: Slider Temporale
- [ ] Componente slider range
- [ ] Filtraggio sinapsi per data
- [ ] Aggiornamento real-time mappa/grafo

### Fase 6: Vista Grafo
- [ ] Cytoscape.js
- [ ] Vista centrata
- [ ] Espansione nodi
- [ ] Sincronizzazione con slider

### Fase 7: Gestione Dati
- [ ] Form inserimento/modifica neurone
- [ ] Form inserimento/modifica sinapsi
- [ ] Gestione multi-categoria per persone

### Fase 8: Note Personali
- [ ] Sistema PIN
- [ ] CRUD note
- [ ] Visualizzazione anonimizzata senza PIN

---

## Funzionalità FUTURE (post-MVP)

### Import da Excel
- [ ] Upload file Excel
- [ ] Mapping colonne → campi
- [ ] Import per categoria (tutti gli imbianchini, tutti i cantieri, ecc.)
- [ ] Validazione e preview prima di importare
- [ ] Gestione duplicati

### Intelligenza Artificiale
- [ ] Query in linguaggio naturale: "Chi ha fatto il cantiere X l'anno scorso?"
- [ ] Suggerimenti: "Questo pittore compra sempre da Colorificio Y"
- [ ] Analisi pattern: "Negli ultimi 6 mesi Rossi ha perso 3 cantieri"
- [ ] Previsioni: "Probabili cantieri in zona nei prossimi mesi"

### Altre Idee Future
- [ ] Export report PDF
- [ ] Notifiche (cantiere in scadenza, ecc.)
- [ ] App mobile nativa (PWA per ora)
- [ ] Multi-utente (più commerciali)
- [ ] Integrazione CRM reale

---

## Note Tecniche

### Verifica Terminal Server (2025-12-19)

| Comando | Risultato |
|---------|-----------|
| `php -v` | 8.3.27 (Zend OPcache) |
| `composer --version` | 2.6.5 |
| `node -v` | Non installato |
| `git --version` | 2.48.2 |

### Workflow Deploy
1. Sviluppo in locale (Windows)
2. Build React: `npm run build` → genera `/dist`
3. Push su GitHub (sorgenti + dist)
4. Su cPanel: Git Version Control → Pull
5. Test su www.gruppogea.net/genagenta/

---

## Architettura Database

```sql
-- NEURONI
neuroni (
  id UUID PRIMARY KEY,
  nome VARCHAR(255),
  tipo ENUM('persona', 'impresa', 'luogo'),
  categorie JSON,  -- ["imbianchino", "cartongessista"]
  visibilita ENUM('aziendale', 'personale') DEFAULT 'aziendale',
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  indirizzo TEXT,
  telefono VARCHAR(50),
  email VARCHAR(255),
  dati_extra JSON,
  data_creazione TIMESTAMP,
  data_modifica TIMESTAMP
)

-- SINAPSI
sinapsi (
  id UUID PRIMARY KEY,
  neurone_da UUID REFERENCES neuroni(id),
  neurone_a UUID REFERENCES neuroni(id),
  tipo_connessione VARCHAR(100),
  data_inizio DATE,
  data_fine DATE NULL,
  valore DECIMAL(12,2) NULL,
  certezza ENUM('certo', 'probabile', 'ipotesi'),
  note TEXT,
  livello ENUM('aziendale', 'personale'),
  data_creazione TIMESTAMP,
  data_modifica TIMESTAMP
)

-- UTENTI
utenti (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  pin_hash VARCHAR(255),  -- per area personale
  nome VARCHAR(255),
  data_creazione TIMESTAMP
)

-- NOTE PERSONALI (extra, per note lunghe)
note_personali (
  id UUID PRIMARY KEY,
  utente_id UUID REFERENCES utenti(id),
  neurone_id UUID REFERENCES neuroni(id),
  testo TEXT,
  data_creazione TIMESTAMP,
  data_modifica TIMESTAMP
)
```

---

## Domande Aperte

(spazio per dubbi da risolvere durante lo sviluppo)

---

## Cronologia Decisioni

| Data | Decisione |
|------|-----------|
| 2025-12-19 | Definito concetto "rete neurale temporale" |
| 2025-12-19 | Confermato stack: PHP + MariaDB + React + Mapbox |
| 2025-12-19 | URL: www.gruppogea.net/genagenta/ |
| 2025-12-19 | Due livelli: aziendale + personale con PIN |
| 2025-12-19 | Slider temporale per visualizzare evoluzione |
| 2025-12-19 | Import Excel e AI come funzionalità future |
| 2025-12-19 | Aggiunti: rappresentanti, marche/produttori e relative connessioni |
| 2025-12-19 | Definiti 2 livelli privacy: aziendale (login), personale (PIN) |
| 2025-12-19 | Note personali possibili su qualsiasi neurone, sempre protette da PIN |
