# Gestione Vendite e Transazioni

## Campi disponibili

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `neurone_id` | uuid | Entità associata (OBBLIGATORIO) |
| `importo` | numero | Importo in € (OBBLIGATORIO, > 0) |
| `data_vendita` | data | Data transazione (default: oggi) |
| `famiglia_id` | uuid | Famiglia prodotto |
| `sinapsi_id` | uuid | Connessione associata |
| `tipo_transazione` | select | `vendita` / `acquisto` |
| `descrizione` | testo | Descrizione transazione |
| `controparte_id` | uuid | Controparte (per transazione bilaterale) |

## Creare vendita

```
call_api("POST", "vendite", {
  "neurone_id": "uuid-cliente",
  "importo": 5000,
  "data_vendita": "2024-06-15",
  "famiglia_id": "uuid-famiglia-prodotto",
  "descrizione": "Fornitura materiali"
})
```

Oppure con tool dedicato:
```
create_sale(
  entity_id="uuid-cliente",
  importo=5000,
  data="2024-06-15",
  famiglia_id="uuid-famiglia",
  descrizione="Fornitura materiali"
)
```

### Transazione bilaterale

Se la vendita coinvolge due entità (es. venditore → acquirente), passa `controparte_id`:
```
call_api("POST", "vendite", {
  "neurone_id": "uuid-venditore",
  "controparte_id": "uuid-acquirente",
  "importo": 5000,
  ...
})
```

Il sistema crea automaticamente il record speculare per la controparte.

## Vedere vendite

```
call_api("GET", "vendite", {})
```

Con filtri:
```
call_api("GET", "vendite?neurone_id=uuid&from=2024-01-01&to=2024-12-31", {})
```

## Eliminare vendita

```
call_api("DELETE", "vendite/{id}", {})
```

Se bilaterale, elimina anche il record della controparte.

## Statistiche vendite

Tool dedicato per analisi:
```
get_sales_stats(
  entity_id="uuid",        // opzionale, filtra per entità
  from_date="2024-01-01",
  to_date="2024-12-31",
  group_by="month"         // month / entity / family
)
```

Restituisce: totali, medie, raggruppamenti.

## Visualizzazione mappa

Le vendite influenzano la visualizzazione 3D:
- **Altezza edificio** = totale vendite (proporzionale al potenziale)
- **Parabole colorate** = vendite per famiglia prodotto (affiancate)

I "dati oggettivi" delle connessioni (volume, transazioni) vengono calcolati automaticamente dalle vendite associate.

---
## Non trovi quello che cerchi?
1. Controlla con `read_learnings()` se ho già scoperto come fare
2. Se non c'è, prova con `explore_code(search="vendite")`
3. Se trovi la soluzione, salvala con `save_learning("vendite", "titolo", "come fare")`
4. Se non trovi, avvisa l'utente: "Non ho trovato come fare X, potresti aiutarmi?"
