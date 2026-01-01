# Istruzioni Gestione Entita (Neuroni)

## Tipi di entità

I tipi sono DINAMICI e configurati dall'utente.
Se non conosci i tipi disponibili, prova a creare con tipo generico
e il sistema ti dirà quali tipi sono configurati.

## Creare entità - PROCEDURA OBBLIGATORIA

**IMPORTANTE: Per apparire sulla mappa, l'entità DEVE avere lat e lng!**

PASSO 1 - Ottieni coordinate:
```
result = geocode_address("Via Roma 1, Milano")
lat = result.results[0].lat
lng = result.results[0].lng
```

PASSO 2 - Crea con TUTTI i parametri:
```
create_entity(
    nome: "Nome Cantiere",
    tipo: "tipo_dal_sistema",
    categorie: ["categoria_dal_sistema"],  // DETERMINA IL COLORE!
    indirizzo: "Via Roma 1, Milano",
    lat: 45.123,      // OBBLIGATORIO per mappa!
    lng: 9.456,       // OBBLIGATORIO per mappa!
    email: "...",     // opzionale
    telefono: "..."   // opzionale
)
```

**SE NON PASSI lat/lng → L'ENTITA' NON APPARE SULLA MAPPA!**

Parametri:
- nome: OBBLIGATORIO
- tipo: OBBLIGATORIO - deve essere uno dei tipi configurati (se sbagliato, il sistema dice quali sono validi)
- categorie: array con nome categoria - DETERMINA IL COLORE! (se non passato, usa la prima disponibile per quel tipo)
- lat, lng: ESSENZIALI per visualizzazione mappa
- indirizzo: per riferimento testuale
- email, telefono: opzionali
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
