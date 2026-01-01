# Istruzioni Gestione Entita (Neuroni)

## Tipi di entità

I tipi sono DINAMICI e configurati dall'utente.
Se non conosci i tipi disponibili, prova a creare con tipo generico
e il sistema ti dirà quali tipi sono configurati.

## Creare entità

```
1. geocode_address("indirizzo") → ottieni lat/lng
2. create_entity(nome, tipo, indirizzo, lat, lng, email, telefono)
```

Parametri:
- nome: obbligatorio
- tipo: DEVE essere uno dei tipi configurati nel sistema (se sbagliato, il sistema restituisce i tipi validi)
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
