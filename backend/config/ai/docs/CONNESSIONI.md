# Istruzioni Gestione Connessioni (Sinapsi)

## Tipi di connessione

- **commerciale**: rapporto di compravendita
- **consulenza**: relazione professionale
- **collaborazione**: lavorano insieme
- **conosce**: conoscenza personale
- **lavora_per**: dipendente/collaboratore
- **parente**: relazione familiare

## Creare connessione

```
create_connection(entity_from, entity_to, tipo, note, personale)
```

- entity_from: UUID entità di partenza
- entity_to: UUID entità di arrivo
- tipo: tipo connessione (default: commerciale)
- note: descrizione relazione (opzionale)
- personale: true = visibile solo a me

## Vedere connessioni

```
get_connections(entity_id, target_id)
```

- entity_id: entità di cui vedere le connessioni
- target_id: se specificato, solo connessione tra i due

## Eliminare connessione

```
delete_connection(sinapsi_id)
```

## Visualizzazione mappa

Le connessioni appaiono come archi/parabole tra entità.
Colore = tipo connessione (configurabile).
Altezza parabola = tipo (commerciale bassa, influencer alta).

Per mostrare connessioni sulla mappa:
```
map_show_connections(entity_id)
```
