# Gestione Entità (Neuroni)

## Campi disponibili

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `nome` | testo | Nome dell'entità (OBBLIGATORIO) |
| `tipo` | select | Tipo entità - dinamico da DB (OBBLIGATORIO) |
| `categorie` | array | Categoria → **DETERMINA IL COLORE** |
| `indirizzo` | testo | Indirizzo completo |
| `lat` / `lng` | numero | Coordinate GPS (**OBBLIGATORIO per mappa**) |
| `email` | email | Email |
| `telefono` | telefono | Telefono |
| `sito_web` | url | Sito web |
| `dimensione` | numero | Dimensione base in metri (larghezza edificio 3D) |
| `potenziale` | numero | Potenziale acquisto in € (altezza edificio 3D) |
| `dati_extra` | json | Campi custom definiti per tipo |
| `visibilita` | select | `aziendale` / `personale` |
| `is_acquirente` | bool | Natura commerciale |
| `is_venditore` | bool | Natura commerciale |
| `is_intermediario` | bool | Natura commerciale |
| `is_influencer` | bool | Natura commerciale |

## Creare entità

**IMPORTANTE: Senza lat/lng l'entità NON appare sulla mappa!**

```
1. geocode_address("Via Roma 1, Milano") → ottieni lat/lng
2. call_api("POST", "neuroni", {
     "nome": "Nome Entità",
     "tipo": "tipo_dal_sistema",
     "categorie": ["categoria"],
     "indirizzo": "Via Roma 1, Milano",
     "lat": 45.123,
     "lng": 9.456
   })
```

Se il tipo è sbagliato, l'API ti dice quali sono validi.
Se la categoria è sbagliata, l'API ti dice quali sono valide per quel tipo.

## Modificare entità

```
call_api("PUT", "neuroni/{id}", { "campo": "nuovo_valore" })
```

Esempi:
- Cambiare nome: `{ "nome": "Nuovo Nome" }`
- Cambiare colore: `{ "categorie": ["nuova_categoria"] }` (vedi COLORI.md)
- Cambiare dimensione: `{ "dimensione": 50 }`
- Cambiare potenziale: `{ "potenziale": 100000 }`

## Eliminare entità

**ATTENZIONE: elimina anche tutte le connessioni e transazioni collegate!**

```
call_api("DELETE", "neuroni/{id}", {})
```

Chiedi SEMPRE conferma all'utente prima di eliminare.

## Cercare entità

```
search_entities(query="testo", tipo="filtro_tipo", limit=10)
```

Oppure via API:
```
call_api("GET", "neuroni/search?q=testo", {})
```

## Dettagli completi

```
get_entity_details(entity_id)
```

Restituisce: dati entità + connessioni + transazioni recenti + totali

---
## Non trovi quello che cerchi?
1. Controlla con `read_learnings()` se ho già scoperto come fare
2. Se non c'è, prova con `explore_code(search="parola_chiave")`
3. Se trovi la soluzione, salvala con `save_learning("entita", "titolo", "come fare")`
4. Se non trovi, avvisa l'utente: "Non ho trovato come fare X, potresti aiutarmi?"
