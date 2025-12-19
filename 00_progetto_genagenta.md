📌 Obiettivo dell’app

Realizzare una webapp (responsive) che giri su:

browser desktop

Android (webview / wrapper)

iOS (webview / wrapper)

che permetta a un commerciale di:

Visualizzare clienti, contatti e cantieri come una rete (grafo) di nodi e relazioni.

Vederli su mappa (tipo Google Maps / Mapbox) con geolocalizzazione.

Filtrare per fatturato, periodo, ruolo, cantiere, ecc.

Gestire due livelli di dati:

livello Aziendale (letto dal CRM, read-only)

livello Personale (note e relazioni private, salvate solo localmente / area protetta)

👥 Utente e ruoli

Per ora c’è un solo tipo di utente (il commerciale / responsabile vendite) con:

login (anche banalissimo per MVP: email + password o token statico)

accesso a:

dati aziendali (letti dal CRM)

area “note personali” separata e protetta da PIN/Password

🧱 Architettura dati (concettuale)
Entità principali (livello Aziendale – letto da CRM)

Persona

id_persona (string/UUID)

nome

cognome

tipo_persona:

"tecnico"

"imbianchino"

"impresa individuale"

"amministratore condominio"

"altro"

azienda_collegata_id (se dipendente di un’impresa)

contatti: telefono, email (opzionale)

geolocalizzazione (facoltativa: es. sede lavoro, città)

Impresa

id_impresa

ragione_sociale

tipo_impresa (impresa edile, studio tecnico, amministrazione condominio, ecc.)

indirizzo

geolocalizzazione (lat, lng)

partita_iva / codice_fiscale (se servono, ma non obbligatorio per MVP)

fatturato_totale_annuo (eventuale campo aggregato; altrimenti calcolato da fatture)

Cantiere

id_cantiere

nome / descrizione

indirizzo

geolocalizzazione (lat, lng) – obbligatoria per visualizzare su mappa

impresa_principale_id

altri_soggetti_coinvolti_ids (lista di id_impresa / id_persona)

data_inizio

data_fine (opzionale)

prodotti_venduti (lista con dettaglio):

elemento lista:

id_prodotto

descrizione_prodotto

quantità

valore_totale

venduto_tramite_id (persona o impresa che ha effettivamente acquistato / intermediato)

Relazioni aziendali (grafo)
Relazioni formali/aziendali fra elementi:

PERSONA → IMPRESA
(:Persona)-[:LAVORA_PER]->(:Impresa)

IMPRESA → CANTIERE
(:Impresa)-[:COINVOLTA_IN]->(:Cantiere)

PERSONA → CANTIERE
(:Persona)-[:REFERENTE_DI]->(:Cantiere)

IMPRESA → IMPRESA (collaborazioni formali, se servono)
(:Impresa)-[:COLLABORA_CON]->(:Impresa)

Ogni relazione può avere:

data_inizio

data_fine (opzionale)

ruolo (es. "applicatore", "progettista", "cliente finale")

Fatture / Movimenti

id_fattura

id_cliente (persona o impresa)

id_cantiere (opzionale, se associata)

data

importo

macro_categoria (es. pitture interne, cappotto, impermeabilizzanti, ecc.)

Entità livello Personale (solo sul dispositivo / area privata)

NotaPersonale

id_nota

riferimento_id (può puntare a Persona, Impresa o Cantiere – tramite id generico)

tipo_riferimento: "persona" | "impresa" | "cantiere"

testo_nota (testo libero)

livello_influenza (numero 1–5, opzionale)

tipo_relazione_anonima (stringa NON sensibile, es. "contatto indiretto", "segnalatore", "fonte privata")

data_creazione

ultimo_aggiornamento

Importante:
Nessun campo tipo: "amante", "figlio di", "amico intimo", ecc.
Tutto deve restare funzionale (contatto, influenza, fonte, ecc.), non morboso.

🔐 Privacy & separazione livelli

Il livello aziendale:

è read-only: i dati vengono letti da un “fake CRM” (per MVP anche da un JSON/DB locale simulato)

può essere cache locale, ma non modificabile dall’utente nell’app

Il livello personale:

è salvato separato (es. tabella/DB differente)

è accessibile solo dopo PIN/Password dedicata

non viene mai mandato al server CRM

NON deve essere esportato in modo massivo (no CSV export dentro l’app)

UI:

Modalità normale = vedi dati aziendali + indicatori che esistono note personali (es. icona “taccuino”)

Dentro l’area “personale” puoi leggere/modificare le note, ma solo tu.

🖥️ Funzionalità principali (MVP)
1. Login & setup

schermata di login semplice

dopo login, caricamento:

dati aziendali da backend (o mock)

note personali dal DB locale

2. Mappa

Vista a mappa con:

nodi geolocalizzati:

Imprese

Cantieri

(opzionalmente persone, se hanno coordinate)

simbolo / colore diverso per:

Impresa (cerchio)

Cantiere (quadrato)

possibilità di:

zoom

pan

clic su un nodo → apre pannello laterale con dettagli

Nel pannello dettaglio:

nome (impresa / cantiere / persona)

tipo

fatturato (aggregato nel periodo selezionato)

elenco relazioni principali (es. cantieri collegati, imprese collegate)

3. Vista Grafo Relazionale

Vista tipo grafo, centrata su un nodo scelto (es. un’impresa).

Mostra:

nodo centrale

nodi a distanza 1 (relazioni dirette)

opzionalmente nodi a distanza 2 (espandibili)

Colori:

bordo/colore nodo = tipologia (impresa, persona, cantiere)

spessore bordo = livello di fatturato (es. più spesso = maggiore fatturato)

Filtri:

per tipo nodo

per periodo di fatturato (mese, trimestre, anno)

per ruolo (imbianchini, amministratori, ecc.)

4. Filtri globali

data / periodo (mese, anno, range date)

soglia fatturato minimo

tipo soggetto (impresa, persona, cantiere)

zona geografica (raggio intorno ad un punto o per provincia)

5. Scheda dettaglio soggetto

Per Persona / Impresa / Cantiere:

dettagli anagrafici

elenco cantieri collegati

fatturato totale nel periodo selezionato

soggetti collegati (con link per aprire vista grafo centrata su di loro)

indicazione se esistono Note personali (icona)

Se l’utente apre l’area personale:

mostra elenco delle note collegate (livello Personale)

permette aggiungere/modificare/cancellare note personali

⚙️ Tecnologie suggerite (ma non obbligatorie)

Puoi dire a Claude qualcosa del genere:

Backend

Node.js + TypeScript

Express o Fastify

Database relazionale (PostgreSQL) per i dati aziendali (simulazione CRM)

Eventuale struttura a grafo simulata via tabelle relazionali o usare Neo4j in futuro

Frontend

React + TypeScript

Libreria per grafi (es. d3-force, React Flow, Sigma.js)

Libreria mappa (Mapbox GL JS o Google Maps JS API)

Storage locale personale

IndexedDB / SQLite (a seconda del wrapper) per salvare NotePersonali

Per l’MVP va bene anche tutto locale (senza vero backend), con file JSON mock, se vuoi prototipare logica UI + grafi.

🔁 Integrazione CRM

Per ora, dire a Claude:

implementa un modulo crmAdapter che espone funzioni tipo:

getPersone()

getImprese()

getCantieri()

getFatture({from, to})

per l’MVP questi leggono da file JSON statici / mock

in futuro si sostituirà con chiamate API reali

✅ Vincoli fondamentali da rispettare

Nessuna scrittura verso il CRM, solo lettura.

Le note personali:

vivono in un archivio separato

sono legate agli id aziendali, ma non vengono mai inviate al backend

Nessun dato “sensibile” sulla natura personale dei rapporti:

si parla solo di:

“contatto indiretto”

“fonte privata”

“influenza livello X”

Possibilità di:

vedere mappa

vedere grafo

filtrare e navigare per soggetto / fatturato / periodo