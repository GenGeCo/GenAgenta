# Configurazione Sistema

Queste sono le tabelle di configurazione. L'AI può LEGGERE ma NON modificare (solo admin da interfaccia).

## Tipi di entità

```
call_api("GET", "tipi", {})
```

Campi:
| Campo | Descrizione |
|-------|-------------|
| `nome` | Nome del tipo (persona, impresa, cantiere...) |
| `icona` | Icona visualizzata |
| `colore_default` | Colore default |
| `ordine` | Ordine visualizzazione |

## Tipologie (categorie/sottotipi)

```
call_api("GET", "tipologie", {})
```

Campi:
| Campo | Descrizione |
|-------|-------------|
| `nome` | Nome categoria |
| `colore` | Colore HEX (#FF0000) → **DETERMINA COLORE ENTITÀ** |
| `tipo_id` | Tipo padre |
| `ordine` | Ordine visualizzazione |

Le tipologie sono collegate ai tipi: ogni tipo ha le sue categorie.

## Tipi di connessione

```
call_api("GET", "tipi-sinapsi", {})
```

Campi:
| Campo | Descrizione |
|-------|-------------|
| `nome` | Nome tipo (commerciale, influencer...) |
| `colore` | Colore parabola |
| `direzionale` | `true` = A→B ha significato |

Tipi direzionali: influencer, fornitore, cliente, tecnico, prescrittore
Tipi non-direzionali: commerciale, partner, collaborazione, conoscenza

## Famiglie prodotto

```
call_api("GET", "famiglie-prodotto", {})
```

Campi:
| Campo | Descrizione |
|-------|-------------|
| `nome` | Nome famiglia (pittura, cartongesso...) |
| `colore` | Colore parabola vendite |
| `descrizione` | Descrizione |

## Campi custom per tipo

Ogni tipo può avere campi aggiuntivi configurati:

| Campo | Descrizione |
|-------|-------------|
| `nome` | Nome tecnico (es: `comune`) |
| `etichetta` | Label nel form (es: "Comune") |
| `tipo_dato` | testo, textarea, numero, data, select, email, telefono, url |
| `opzioni` | Per select: array di opzioni |
| `obbligatorio` | Se richiesto |
| `ordine` | Ordine nel form |

I campi custom vengono salvati in `dati_extra` (JSON) delle entità.

## Lettura configurazione

Per sapere quali tipi/categorie sono disponibili PRIMA di creare:

```
// Tipi di entità
call_api("GET", "tipi", {})

// Categorie per un tipo specifico
call_api("GET", "tipologie", {})
// poi filtra per tipo_id

// Tipi di connessione
call_api("GET", "tipi-sinapsi", {})

// Famiglie prodotto
call_api("GET", "famiglie-prodotto", {})
```

---
## Non trovi quello che cerchi?
1. Controlla con `read_learnings()` se ho già scoperto come fare
2. Se non c'è, prova con `explore_code(search="config")`
3. Se trovi la soluzione, salvala con `save_learning("configurazione", "titolo", "come fare")`
4. Se non trovi, avvisa l'utente: "Non ho trovato come fare X, potresti aiutarmi?"
