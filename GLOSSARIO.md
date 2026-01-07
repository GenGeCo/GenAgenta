# GenAgenTa - Glossario Termini

> Questo file definisce i nomi ufficiali usati nel codice e nelle conversazioni.
> Obiettivo: coerenza tra UI, database, codice e comunicazione.

---

## TERMINI UFFICIALI (CONFERMATI)

### Entità sulla mappa

| Nel codice (DB/API) | Nell'interfaccia | Significato |
|---------------------|------------------|-------------|
| `entita` | **Entità** | Un elemento sulla mappa (cantiere, persona, rivendita...) |
| `connessione` | **Connessione** | Legame tra due entità |
| `tipo` | **Tipo** | Categoria principale (Cantiere, Tecnico, Rivendita) |
| `tipologia` | **Tipologia** | Sottocategoria (Villa, Palazzina, Architetto...) |
| `forma` | **Forma** | Geometria 3D (cerchio, quadrato, triangolo...) |

### Certezza connessioni

| Nel codice | Nell'interfaccia | Colore |
|------------|------------------|--------|
| `certo` | **Confermato** | Verde |
| `probabile` | **Probabile** | Giallo/Arancio |
| `ipotesi` | **Da verificare** | Rosso/Grigio |

### Visibilità dati

| Nel codice | Nell'interfaccia | Significato |
|------------|------------------|-------------|
| `aziendale` | **Condiviso** | Tutti nel team vedono |
| `personale` | **Privato** | Solo io vedo (richiede PIN) |

### Sistema utenti

| Nel codice | Nell'interfaccia | Significato |
|------------|------------------|-------------|
| `azienda` | **Team** | Gruppo di lavoro |
| `admin` | **Responsabile** | Gestisce il team |
| `membro` | **Membro** | Utente base |
| `codice_pairing` | **Codice Team** | Per invitare colleghi |

---

## STRUTTURA GERARCHIA

```
TIPO (forma + colore base)
  └─ TIPOLOGIA (colore specifico, multipla con checkbox)
```

Esempio:
```
Cantiere (quadrato)
  ├─ [x] Villa          (verde)
  ├─ [x] Palazzina      (blu)
  ├─ [ ] Edificio pub.  (rosso)

Rivendita (cerchio)
  ├─ [x] Pitture        (giallo)    ← può avere più tipologie
  ├─ [x] Cartongesso    (grigio)    ← flaggate insieme
  ├─ [ ] Impermeab.     (blu)
```

---

## PROPOSTA NUOVA INTERFACCIA SETUP

### Problema attuale
L'interfaccia in Impostazioni > Categorie ha 3 tab separati e confusi.

### Proposta: Vista unificata ad albero

```
CONFIGURAZIONE ENTITÀ
=====================

[+ Nuovo Tipo]

▼ Cantiere        ■ quadrato
    ├─ Villa                    ● verde
    ├─ Palazzina               ● blu
    ├─ Edificio pubblico       ● rosso
    └─ [+ aggiungi tipologia]

▼ Tecnico         ▲ triangolo
    ├─ Architetto              ● viola
    ├─ Ingegnere               ● arancio
    ├─ Geometra                ● azzurro
    └─ [+ aggiungi tipologia]

▼ Rivendita       ● cerchio
    ├─ Pitture                 ● giallo
    ├─ Cartongesso             ● grigio
    ├─ Impermeabilizzanti      ● blu scuro
    └─ [+ aggiungi tipologia]

─────────────────────────────

TIPI CONNESSIONE
================

[+ Nuovo tipo connessione]

Confermato        ━━━━━  ● verde
Probabile         ─ ─ ─  ● giallo
Da verificare     · · ·  ● rosso
```

### Interazioni
- ▼/▶ per espandere/collassare tipo
- Click su nome → modifica inline
- Click su forma/colore → picker
- Drag & drop per riordinare
- Swipe/X per eliminare

---

## MAPPING CODICE

Per il refactoring, ecco la corrispondenza:

| Vecchio (codice attuale) | Nuovo (da implementare) |
|--------------------------|-------------------------|
| `neuroni` (tabella) | `entita` |
| `sinapsi` (tabella) | `connessioni` |
| `tipi_neurone` | `tipi` |
| `categorie` | `tipologie` |
| `tipi_sinapsi` | `tipi_connessione` |

---

debuga ai:
https://www.gruppogea.net/genagenta/backend/ai-debug.php


*File creato per allineare terminologia. Non viene deployato sul server (solo GitHub).*
