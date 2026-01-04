# Come Funzionano i Colori

## Concetto chiave

Il **colore** di un'entità NON è un campo diretto!
Il colore dipende dalla sua **categoria** (campo `categorie`).

Ogni categoria ha un colore definito nella configurazione.

## Cambiare colore di un'entità

### Passo 1: Vedi le categorie disponibili

```
call_api("GET", "tipologie", {})
```

Risposta esempio:
```json
[
  { "nome": "cliente_attivo", "colore": "#4CAF50" },
  { "nome": "cliente_potenziale", "colore": "#FFC107" },
  { "nome": "cliente_perso", "colore": "#F44336" }
]
```

### Passo 2: Cambia la categoria dell'entità

```
call_api("PUT", "neuroni/{id}", {
  "categorie": ["cliente_attivo"]
})
```

L'entità assumerà il colore della nuova categoria.

## Esempi pratici

**"Fallo verde"** → cerca categoria con colore verde:
```
1. call_api("GET", "tipologie", {})
2. Trova categoria con colore ~verde (#4CAF50, #00FF00, etc.)
3. call_api("PUT", "neuroni/{id}", { "categorie": ["nome_categoria_verde"] })
```

**"Cambia colore a rosso"** → stessa procedura, cerca rosso.

## Colori delle connessioni

Le connessioni (sinapsi) hanno colore basato sul **tipo di connessione**.

Vedi tipi disponibili:
```
call_api("GET", "tipi-sinapsi", {})
```

## Colori delle famiglie prodotto

Le parabole che rappresentano le vendite usano il colore della **famiglia prodotto**.

Vedi famiglie:
```
call_api("GET", "famiglie-prodotto", {})
```

## Riepilogo

| Elemento | Da cosa dipende il colore |
|----------|--------------------------|
| Entità (neuroni) | `categorie` → tipologie |
| Connessioni (sinapsi) | `tipo_connessione` → tipi-sinapsi |
| Parabole vendite | `famiglia_id` → famiglie-prodotto |

---
## Non trovi quello che cerchi?
1. Controlla con `read_learnings()` se ho già scoperto come fare
2. Se non c'è, prova con `explore_code(search="colore")`
3. Se trovi la soluzione, salvala con `save_learning("colori", "titolo", "come fare")`
4. Se non trovi, avvisa l'utente: "Non ho trovato come fare X, potresti aiutarmi?"
