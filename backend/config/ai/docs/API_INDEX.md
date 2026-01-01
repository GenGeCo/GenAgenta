# Indice API GenAgenta

Usa `call_api(method, endpoint, body)` per chiamare queste API.

## API v1 (endpoint senza prefisso)

### Neuroni (Entità)
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `neuroni` | Lista tutti i neuroni |
| GET | `neuroni/search?q=testo` | Cerca neuroni per nome |
| GET | `neuroni/{id}` | Dettagli singolo neurone |
| POST | `neuroni` | Crea nuovo neurone |
| PUT | `neuroni/{id}` | Aggiorna neurone |
| DELETE | `neuroni/{id}` | Elimina neurone |
| GET | `neuroni/{id}/sinapsi` | Connessioni di un neurone |

### Sinapsi (Connessioni)
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `sinapsi` | Lista tutte le sinapsi |
| GET | `sinapsi/{id}` | Dettagli singola sinapsi |
| POST | `sinapsi` | Crea nuova sinapsi |
| PUT | `sinapsi/{id}` | Aggiorna sinapsi |
| DELETE | `sinapsi/{id}` | Elimina sinapsi |

### Note Personali
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `note` | Lista note |
| POST | `note` | Crea nota |
| PUT | `note/{id}` | Aggiorna nota |
| DELETE | `note/{id}` | Elimina nota |

### Configurazione
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `tipi-neurone` | Lista tipi di entità |
| POST | `tipi-neurone` | Crea tipo entità |
| PUT | `tipi-neurone/{id}` | Aggiorna tipo |
| DELETE | `tipi-neurone/{id}` | Elimina tipo |
| GET | `categorie` | Lista categorie (sottotipi) |
| POST | `categorie` | Crea categoria |
| PUT | `categorie/{id}` | Aggiorna categoria |
| DELETE | `categorie/{id}` | Elimina categoria |
| GET | `tipi-sinapsi` | Lista tipi connessione |
| POST | `tipi-sinapsi` | Crea tipo connessione |
| PUT | `tipi-sinapsi/{id}` | Aggiorna tipo connessione |
| DELETE | `tipi-sinapsi/{id}` | Elimina tipo connessione |
| GET | `famiglie-prodotto` | Lista famiglie prodotto |
| POST | `famiglie-prodotto` | Crea famiglia |
| PUT | `famiglie-prodotto/{id}` | Aggiorna famiglia |
| DELETE | `famiglie-prodotto/{id}` | Elimina famiglia |

### Utility
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `stats` | Dashboard statistiche |
| GET | `geocode/search?q=indirizzo` | Geocoding indirizzo |

---

## API v2 (endpoint con prefisso `v2/`)

### Entità (alternativa a neuroni)
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `v2/entita` | Lista entità |
| GET | `v2/entita/{id}` | Dettagli entità |
| POST | `v2/entita` | Crea entità |
| PUT | `v2/entita/{id}` | Aggiorna entità |
| DELETE | `v2/entita/{id}` | Elimina entità |

### Tipi e Tipologie
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `v2/tipi` | Lista tipi entità con forme |
| POST | `v2/tipi` | Crea tipo |
| PUT | `v2/tipi/{id}` | Aggiorna tipo |
| DELETE | `v2/tipi/{id}` | Elimina tipo |
| GET | `v2/tipologie` | Lista tipologie (sottocategorie) |
| GET | `v2/tipologie?tipo={id}` | Tipologie di un tipo specifico |
| POST | `v2/tipologie` | Crea tipologia |
| PUT | `v2/tipologie/{id}` | Aggiorna tipologia |
| DELETE | `v2/tipologie/{id}` | Elimina tipologia |

### Connessioni
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `v2/connessioni` | Lista connessioni |
| GET | `v2/connessioni/{id}` | Dettagli connessione |
| POST | `v2/connessioni` | Crea connessione |
| PUT | `v2/connessioni/{id}` | Aggiorna connessione |
| DELETE | `v2/connessioni/{id}` | Elimina connessione |

### Vendite
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `v2/vendite` | Lista vendite |
| POST | `v2/vendite` | Crea vendita |
| PUT | `v2/vendite/{id}` | Aggiorna vendita |
| DELETE | `v2/vendite/{id}` | Elimina vendita |

---

## Parametri comuni

### Creazione Neurone (POST neuroni)
```json
{
  "nome": "Nome entità",
  "tipo": "ID del tipo",
  "categorie": ["ID categoria"],
  "indirizzo": "Via Roma 1, Milano",
  "lat": 45.464,
  "lng": 9.191,
  "email": "email@example.com",
  "telefono": "+39 123456789",
  "visibilita": "aziendale|personale"
}
```

### Creazione Sinapsi (POST sinapsi)
```json
{
  "neurone_a_id": "UUID neurone origine",
  "neurone_b_id": "UUID neurone destinazione",
  "tipo": "ID tipo connessione",
  "data_inizio": "2024-01-01",
  "note": "Note sulla connessione"
}
```

---

## Note importanti

1. **Autenticazione**: Tutte le API richiedono token JWT nell'header Authorization
2. **Filtro azienda**: Le API filtrano automaticamente per azienda_id dell'utente
3. **Visibilità**:
   - `aziendale` = visibile a tutto il team
   - `personale` = visibile solo al creatore (richiede PIN)
4. **Coordinate**: Per apparire sulla mappa, lat e lng sono OBBLIGATORI
5. **Categorie**: Determinano il COLORE dell'entità sulla mappa

## Esempi

### Creare un'entità sulla mappa
```
1. Geocodifica: call_api("GET", "geocode/search?q=Via Roma 1, Milano")
2. Crea: call_api("POST", "neuroni", {
     "nome": "Cliente ABC",
     "tipo": "cliente",
     "lat": 45.464,
     "lng": 9.191
   })
```

### Collegare due entità
```
call_api("POST", "sinapsi", {
  "neurone_a_id": "uuid-entita-1",
  "neurone_b_id": "uuid-entita-2",
  "tipo": "commerciale"
})
```
