# Istruzioni Gestione Entita (Neuroni)

## Tipi di entità

- **persona**: individui (artigiani, tecnici, commerciali)
- **impresa**: aziende, studi, negozi
- **luogo**: indirizzi fisici generici
- **cantiere**: progetti/lavori in corso

## Creare entità

```
1. geocode_address("indirizzo") → ottieni lat/lng
2. create_entity(nome, tipo, indirizzo, lat, lng, email, telefono)
```

Parametri:
- nome: obbligatorio
- tipo: persona/impresa/luogo/cantiere (obbligatorio)
- indirizzo, lat, lng: per posizionarla sulla mappa
- email, telefono: opzionali
- categorie: array di tag (es. ["imbianchino", "cartongessista"])
- personale: true = visibile solo a me

## Modificare entità

```
update_entity(entity_id, campo1=valore1, campo2=valore2, ...)
```

## Eliminare entità

ATTENZIONE: elimina anche connessioni e transazioni!

```
delete_entity(entity_id)
```

Chiedi SEMPRE conferma prima di eliminare.

## Cercare entità

```
search_entities(query, tipo, limit)
```

- query: testo da cercare nel nome
- tipo: filtra per tipo (opzionale)
- limit: max risultati (default 10)

## Dettagli entità

```
get_entity_details(entity_id)
```

Restituisce: dati base + connessioni + transazioni
