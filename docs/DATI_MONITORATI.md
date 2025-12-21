# GenAgenta - Definizione Dati Monitorati

## FILOSOFIA DEL SISTEMA

GenAgenta **NON è un CRM operativo**. È un **CRM analitico satellite** che:
- Riceve dati aggregati dal CRM aziendale principale (via import Excel)
- Si popola con inserimenti manuali per relazioni e contatti esterni
- **Scopo**: scoprire RELAZIONI e INFLUENZE nascoste

### La domanda chiave
> "Perché quando c'è l'ingegnere X si vende tanto, ma quando c'è il pittore Y non si vende nulla?"

### Il valore dell'incrocio
```
MAPPA RELAZIONI  +  DATI ACQUISTO  =  CHI INFLUENZA LE VENDITE
     (chi)              (cosa)              (perché)
```

---

## 1. FLUSSO DATI: AUTOMATICO vs MANUALE

### 1.1 DATI AUTOMATICI (Import Excel mensile)

**Cosa viene importato:**
- I TUOI clienti (chi compra da te)
- Fatturato per periodo (mese)
- Dettaglio per famiglia prodotto

**Esempio Excel import:**
```
Cliente          | Periodo  | Famiglia      | Dettaglio      | Valore
-----------------|----------|---------------|----------------|--------
Pittore Mario    | Gen 2025 | Pitture       | Idropittura    | 1500€
Pittore Mario    | Gen 2025 | Pitture       | Smalto         | 300€
Impresa Rossi    | Gen 2025 | Cappotto      | Pannelli EPS   | 4000€
Impresa Rossi    | Gen 2025 | Cappotto      | Rasante        | 800€
Ferramenta Bianchi| Gen 2025| Utensili      | Pennelli       | 200€
```

**Fonte**: Export dal gestionale/CRM aziendale

### 1.2 DATI MANUALI (Inseriti quando scopri)

**Cosa inserisci a mano:**
- Contatti che NON sono tuoi clienti (concorrenti, potenziali, influencer)
- Relazioni tra entità (chi lavora con chi, chi compra da chi)
- Ipotesi e conferme
- Chi ti ha segnalato un contatto

**Esempi di inserimento manuale:**

```
Giorno 1: Vedo Ferramenta Verdi (non è mio cliente)
          → Creo neurone "Ferramenta Verdi" (tipo: impresa, cat: ferramenta)
          → Chi me l'ha detto? Pittore Mario
          → Creo sinapsi: Mario → referenzia → Ferramenta Verdi

Giorno 5: Sento che Impresa Rossi forse compra cappotto da Edil Sud
          → Creo neurone "Edil Sud" (concorrente)
          → Creo sinapsi: Rossi → compra_da → Edil Sud
          → Certezza: 🔴 IPOTESI

Giorno 15: Confermo! Rossi compra davvero da Edil Sud
          → Modifico sinapsi: Certezza → 🟢 CERTO
          → Aggiungo nota: "compra pannelli EPS e rete"

Giorno 20: Scopro che Rossi compra ANCHE da MegaCappotto
          → Creo nuova sinapsi: Rossi → compra_da → MegaCappotto
          → Nota: "solo rasante e finitura"
```

---

## 2. NEURONI (Anagrafica)

### PERSONA
| Campo | Tipo | Auto/Man | Note |
|-------|------|----------|------|
| nome | testo | AUTO | Dal CRM aziendale |
| categoria | selezione | AUTO/MAN | cartongessista, pittore, ingegnere... |
| azienda | relazione | MAN | Link a impresa di appartenenza |
| ruolo | selezione | MAN | titolare, tecnico, resp. acquisti |
| telefono | telefono | AUTO | |
| email | email | AUTO | |
| indirizzo | indirizzo | AUTO | |
| zona_operativa | testo | MAN | Comuni/province dove lavora |
| note | testo | MAN | |

### IMPRESA
| Campo | Tipo | Auto/Man | Note |
|-------|------|----------|------|
| ragione_sociale | testo | AUTO | |
| categoria | selezione | AUTO/MAN | impresa_edile, colorificio, rivendita... |
| p_iva | testo | AUTO | |
| telefono | telefono | AUTO | |
| email | email | AUTO | |
| indirizzo | indirizzo | AUTO | |
| classificazione | selezione | AUTO | A/B/C basato su fatturato |
| is_cliente | booleano | AUTO | TRUE se compra da noi |
| is_concorrente | booleano | MAN | TRUE se è concorrente |
| note | testo | MAN | |

### LUOGO (Cantiere)
| Campo | Tipo | Auto/Man | Note |
|-------|------|----------|------|
| nome | testo | MAN | "Cantiere Via Roma 15" |
| indirizzo | indirizzo | MAN | |
| tipo_lavoro | selezione | MAN | ristrutturazione, nuova costruzione |
| data_inizio | data | MAN | |
| data_fine | data | MAN | |
| impresa_principale | relazione | MAN | Chi gestisce |
| valore_lavori | numero | MAN | Importo stimato |

---

## 3. SINAPSI (Relazioni)

Le connessioni sono il **cuore** del sistema.

### Tipi di Relazione
| Tipo | Descrizione | Esempio |
|------|-------------|---------|
| lavora_per | Dipendente/collaboratore | Mario → Impresa Rossi |
| lavora_con | Collaborazione tra pari | Ing. Bianchi ↔ Arch. Verdi |
| specifica | Prescrive/raccomanda | Ingegnere → Cantiere |
| fornisce | Vende a | Colorificio → Impresa |
| compra_da | Acquista da | Impresa → Rivendita |
| referenzia | Porta lavoro/segnala | Pittore → Colorificio |
| influenza | Influenza decisioni | Capocantiere → Scelte |

### Campi della Sinapsi
| Campo | Tipo | Note |
|-------|------|------|
| neurone_da | uuid | Chi parte |
| neurone_a | uuid | Chi arriva |
| tipo | selezione | Tipo relazione |
| data_inizio | data | Quando è iniziata |
| data_fine | data | Se terminata (null = attiva) |
| **certezza** | selezione | 🔴 ipotesi / 🟡 probabile / 🟢 certo |
| **fonte** | testo | "visto sul cantiere", "me l'ha detto X" |
| **data_verifica** | data | Quando l'hai confermato |
| forza | 1-5 | Quanto è forte il legame |
| note | testo | Dettagli |

### Livelli di Certezza
| Livello | Icona | Significato | Esempio |
|---------|-------|-------------|---------|
| ipotesi | 🔴 | "Credo che..." | "Mi sembra che compri da Rossi" |
| probabile | 🟡 | "Quasi sicuro" | "L'ho visto uscire da Rossi" |
| certo | 🟢 | "Confermato" | "Me l'ha detto lui" |

---

## 4. ACQUISTI (Import automatico)

### Struttura Import
```
Cliente: Impresa Rossi
Periodo: Gennaio 2025
----------------------------------------
Famiglia         | Prodotto      | Qtà    | Valore
-----------------|---------------|--------|--------
Pitture          | Idropittura X | 200 lt | 800€
Pitture          | Smalto Y      | 50 lt  | 300€
Cappotto         | Pannelli EPS  | 100 mq | 2000€
Cappotto         | Rasante       | 20 sac | 400€
----------------------------------------
TOTALE PERIODO: 3.500€
```

### Tabella `acquisti`
| Campo | Tipo | Note |
|-------|------|------|
| id | uuid | |
| cliente_id | uuid | Chi ha comprato |
| periodo | date | Primo del mese |
| famiglia_id | uuid | Link a famiglia prodotto |
| prodotto | testo | Nome specifico (opzionale) |
| quantita | numero | |
| unita_misura | selezione | lt, kg, mq, pz... |
| valore | numero | Importo € |
| cantiere_id | uuid | Dove è andato (opzionale) |

---

## 5. FAMIGLIE PRODOTTO (Gerarchiche)

L'utente definisce le proprie famiglie in base al settore.

### Esempio: Colorificio/Edilizia
```
PITTURE (famiglia padre)
├── Idropitture
├── Smalti
├── Primer/Fissativi
├── Vernici legno
└── Quarzi/Graffiati

CAPPOTTO
├── Pannelli EPS
├── Pannelli lana roccia
├── Rasante
├── Rete
├── Tasselli
└── Finitura

CARTONGESSO
├── Lastre standard
├── Lastre idro
├── Profili
├── Viti
└── Stucco
```

### Esempio: Ferramenta
```
BULLONERIA
├── Bulloni
├── Dadi
├── Rondelle
└── Viti

UTENSILI
├── Chiavi inglesi
├── Cacciaviti
├── Pinze
└── Martelli

ELETTRICO
├── Cavi
├── Interruttori
├── Prese
└── Quadri
```

### Tabella `famiglie_prodotto`
```sql
CREATE TABLE famiglie_prodotto (
    id VARCHAR(36) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    parent_id VARCHAR(36), -- per gerarchia (padre → figlio)
    ordine INT DEFAULT 0,
    visibilita ENUM('aziendale', 'personale'),
    azienda_id VARCHAR(36)
);
```

---

## 6. ANALISI E INSIGHT

### 6.1 Cosa compra ogni cliente (da import)
```
Impresa Rossi (ultimo anno):
✓ Pitture         → 15.000€
✓ Cappotto        → 45.000€
✓ Cartongesso     → 8.000€
✗ Primer          → 0€  ← ANOMALIA: fa cappotto ma non primer?
```

### 6.2 Cosa NON compra (opportunità)
```
Alert: Impresa Rossi compra cappotto ma NON compra:
- Rete cappotto
- Tasselli
- Primer fondo
→ Li compra altrove? (vedi sinapsi "compra_da")
```

### 6.3 Chi influenza (da sinapsi)
```
Analisi: Quando l'Ing. Bianchi specifica un cantiere:
- Vendite medie: +40%
- Prodotti premium: +60%

Analisi: Quando il Pittore Neri è sul cantiere:
- Vendite: -30%
→ È un "bloccante" (porta materiale suo)
```

### 6.4 Relazioni dubbie da verificare
```
Sinapsi con certezza 🔴 IPOTESI:
1. Rossi → compra_da → Edil Sud (da 30 giorni)
2. Ferramenta Blu → fornisce → Impresa Verdi (da 15 giorni)

→ Da confermare sul campo!
```

---

## 7. FLUSSO OPERATIVO MENSILE

### Inizio mese: Import dati
```
1. Export dal gestionale (fatture mese precedente)
2. Formatta Excel secondo template
3. Import in GenAgenta
4. Verifica dati importati
```

### Durante il mese: Aggiornamenti manuali
```
- Scopri nuovo contatto → Crea neurone
- Scopri relazione → Crea sinapsi (con certezza)
- Confermi ipotesi → Aggiorna certezza sinapsi
- Nuovo cantiere → Crea neurone luogo + relazioni
```

### Fine mese: Analisi
```
- Chi ha comprato cosa
- Chi NON compra cosa (gap)
- Nuove relazioni scoperte
- Ipotesi da verificare
```

---

## 8. PRIORITÀ IMPLEMENTAZIONE

### Fase 1 - Core (ora)
1. ✅ Tipi neurone e categorie
2. 🔲 Form creazione sinapsi con certezza
3. 🔲 Famiglie prodotto gerarchiche

### Fase 2 - Acquisti
4. 🔲 Import Excel acquisti
5. 🔲 Vista riepilogo cliente

### Fase 3 - Analisi
6. 🔲 Vista "cosa NON compra"
7. 🔲 Report influencer
8. 🔲 Lista ipotesi da verificare

---

*Documento aggiornato: 21/12/2024*
*Versione: 2.0 - Flusso automatico/manuale chiarito*
