# Istruzioni Mappa 3D

## Navigare sulla mappa

Per spostare la vista della mappa:

```
1. geocode_address("indirizzo") → ottieni lat/lng
2. map_fly_to(lat, lng, zoom, pitch)
```

Parametri map_fly_to:
- lat, lng: coordinate (obbligatori)
- zoom: 1-20 (default 15, usa 12 per città, 18 per edificio)
- pitch: inclinazione 0-85 (default 60 per vista 3D)

## Selezionare entità

Per evidenziare un'entità e aprire il suo pannello:

```
1. search_entities("nome") → trova ID
2. map_select_entity(entity_id)
```

## Mostrare connessioni

Per visualizzare le connessioni di un'entità:

```
map_show_connections(entity_id)
```

## Esempi comuni

"Portami a Roma":
→ geocode_address("Roma, Italia")
→ map_fly_to(41.9, 12.5, 12)

"Mostrami il cliente Rossi":
→ search_entities("Rossi")
→ map_select_entity(id_trovato)

"Vedi le connessioni di Bianchi":
→ search_entities("Bianchi")
→ map_show_connections(id_trovato)
