# Controllo Mappa 3D

## Azioni disponibili

| Azione | Tool | Descrizione |
|--------|------|-------------|
| Vola a posizione | `map_fly_to` | Sposta la vista |
| Cambia stile | `map_set_style` | Satellite, scuro, etc. |
| Seleziona entità | `map_select_entity` | Evidenzia e apri pannello |
| Mostra connessioni | `map_show_connections` | Evidenzia parabole |

## Navigare sulla mappa

### Vola a un indirizzo

```
1. geocode_address("Via Roma 1, Milano")
   → risultato: { lat: 45.123, lng: 9.456 }

2. map_fly_to(lat=45.123, lng=9.456, zoom=15)
```

### Parametri map_fly_to

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `lat` | numero | - | Latitudine (OBBLIGATORIO) |
| `lng` | numero | - | Longitudine (OBBLIGATORIO) |
| `zoom` | 1-20 | 15 | Livello zoom |
| `pitch` | 0-85 | 60 | Inclinazione (0=dall'alto, 60=3D) |
| `bearing` | 0-360 | 0 | Rotazione (0=nord in alto) |

Valori zoom tipici:
- `10` = regione
- `12` = città
- `15` = quartiere
- `18` = edificio singolo

## Cambiare stile mappa

```
map_set_style(style="satellite-v9")
```

Stili disponibili:
| Stile | Descrizione |
|-------|-------------|
| `streets-v12` | Strade (default) |
| `satellite-v9` | Vista satellite |
| `satellite-streets-v12` | Satellite + strade |
| `outdoors-v12` | Terreno/escursioni |
| `light-v11` | Chiaro/minimalista |
| `dark-v11` | Scuro/notte |

## Selezionare un'entità

```
1. search_entities("Rossi")
   → trova ID

2. map_select_entity(entity_id="uuid-trovato")
   → vola all'entità e la evidenzia
```

## Mostrare connessioni

```
map_show_connections(entity_id="uuid")
```

Evidenzia tutte le parabole che partono o arrivano a quell'entità.

## Esempi comuni

**"Portami a Roma"**
```
geocode_address("Roma, Italia")
map_fly_to(lat=41.9, lng=12.5, zoom=12)
```

**"Vista satellite"**
```
map_set_style(style="satellite-v9")
```

**"Zooma di più"**
```
map_fly_to(lat=..., lng=..., zoom=18)
```

**"Ruota la mappa verso est"**
```
map_fly_to(lat=..., lng=..., bearing=90)
```

**"Vista dall'alto"**
```
map_fly_to(lat=..., lng=..., pitch=0)
```

---
## Non trovi quello che cerchi?
1. Controlla con `read_learnings()` se ho già scoperto come fare
2. Se non c'è, prova con `explore_code(search="map")`
3. Se trovi la soluzione, salvala con `save_learning("mappa", "titolo", "come fare")`
4. Se non trovi, avvisa l'utente: "Non ho trovato come fare X, potresti aiutarmi?"
