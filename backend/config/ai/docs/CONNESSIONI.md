# Gestione Connessioni (Sinapsi)

## Campi disponibili

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `neurone_da` | uuid | Entità origine (OBBLIGATORIO) |
| `neurone_a` | uuid | Entità destinazione (OBBLIGATORIO) |
| `tipo_connessione` | array | Tipi connessione (OBBLIGATORIO) |
| `data_inizio` | data | Data inizio relazione (OBBLIGATORIO) |
| `data_fine` | data | Data fine relazione |
| `famiglia_prodotto_id` | uuid | Famiglia prodotto associata |
| `valore` | numero | Valore monetario relazione |
| `certezza` | select | `certo` / `probabile` / `incerto` |
| `fonte` | testo | Fonte dell'informazione |
| `data_verifica` | data | Ultima verifica |
| `note` | testo | Note libere |
| `livello` | select | `aziendale` / `personale` |

### Dati soggettivi (valutazione 1-5 stelle)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `influenza` | 1-5 | Livello di influenza |
| `qualita_relazione` | 1-5 | Qualità del rapporto |
| `importanza_strategica` | 1-5 | Importanza strategica |
| `affidabilita` | 1-5 | Affidabilità pagamenti/impegni |
| `potenziale` | 1-5 | Potenziale di crescita |
| `note_relazione` | testo | Note sulla relazione |

## Tipi di connessione

I tipi sono dinamici (configurati dall'utente). Esempi comuni:
- `commerciale` - rapporto di compravendita
- `influencer` - relazione di influenza
- `prescrittore` - prescrive/raccomanda
- `fornitore` - fornisce prodotti/servizi
- `partner` - partnership
- `tecnico` - supporto tecnico
- `collaborazione` - lavorano insieme

Alcuni tipi sono **direzionali** (A→B ha significato diverso da B→A).

## Creare connessione

```
call_api("POST", "sinapsi", {
  "neurone_da": "uuid-entita-1",
  "neurone_a": "uuid-entita-2",
  "tipo_connessione": ["commerciale"],
  "data_inizio": "2024-01-15",
  "certezza": "certo",
  "note": "Cliente importante"
})
```

Oppure con tool dedicato:
```
create_connection(
  entity_from="uuid-1",
  entity_to="uuid-2",
  tipo="commerciale",
  note="Descrizione"
)
```

## Modificare connessione

```
call_api("PUT", "sinapsi/{id}", {
  "campo": "nuovo_valore"
})
```

Esempi:
- Aggiungere valutazione: `{ "qualita_relazione": 4, "affidabilita": 5 }`
- Cambiare certezza: `{ "certezza": "probabile" }`
- Aggiungere note: `{ "note_relazione": "Da seguire..." }`

## Eliminare connessione

```
call_api("DELETE", "sinapsi/{id}", {})
```

**ATTENZIONE:** elimina anche le transazioni collegate a questa connessione!

## Vedere connessioni

```
get_connections(entity_id="uuid", target_id="uuid-opzionale")
```

- `entity_id`: vedi tutte le connessioni di questa entità
- `target_id`: filtra solo la connessione tra le due entità

## Visualizzazione mappa

Le connessioni appaiono come **parabole 3D** tra entità:
- **Colore** = tipo connessione
- **Altezza** = tipo (commerciale bassa, influencer alta)
- **Parabole affiancate** = diverse famiglie prodotto

Per evidenziare connessioni sulla mappa:
```
map_show_connections(entity_id)
```

---
## Non trovi quello che cerchi?
1. Controlla con `read_learnings()` se ho già scoperto come fare
2. Se non c'è, prova con `explore_code(search="sinapsi")`
3. Se trovi la soluzione, salvala con `save_learning("connessioni", "titolo", "come fare")`
4. Se non trovi, avvisa l'utente: "Non ho trovato come fare X, potresti aiutarmi?"
