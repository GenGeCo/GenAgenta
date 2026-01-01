# API GenAgenta

Usa `call_api(method, endpoint, body)`.
Se sbagli, l'API ti dice cosa correggere.

## Entità (neuroni)
| Metodo | Endpoint | Cosa fa |
|--------|----------|---------|
| GET | neuroni | Lista tutte |
| GET | neuroni/{id} | Dettagli una |
| POST | neuroni | Crea nuova |
| PUT | neuroni/{id} | Modifica |
| DELETE | neuroni/{id} | Elimina |
| GET | neuroni/search?q=... | Cerca per nome |

## Connessioni (sinapsi)
| Metodo | Endpoint | Cosa fa |
|--------|----------|---------|
| GET | sinapsi | Lista tutte |
| GET | sinapsi/{id} | Dettagli una |
| POST | sinapsi | Crea nuova |
| PUT | sinapsi/{id} | Modifica |
| DELETE | sinapsi/{id} | Elimina |

## Transazioni (vendite)
| Metodo | Endpoint | Cosa fa |
|--------|----------|---------|
| GET | v2/vendite | Lista vendite |
| POST | v2/vendite | Registra vendita |
| DELETE | v2/vendite/{id} | Elimina vendita |

## Configurazione
| Metodo | Endpoint | Cosa fa |
|--------|----------|---------|
| GET | v2/tipi | Tipi di entità disponibili |
| GET | v2/tipologie | Categorie/sottotipi |
| GET | v2/tipi-connessione | Tipi di connessione |
| GET | famiglie-prodotto | Famiglie prodotto |

## Utility
| Metodo | Endpoint | Cosa fa |
|--------|----------|---------|
| GET | geocode/search?q=... | Coordinate da indirizzo |
| GET | stats | Statistiche dashboard |

## Note
- Per creare entità sulla mappa: prima geocode per ottenere lat/lng
- L'API ti dirà se mancano campi obbligatori
- L'API ti dirà i valori validi per i campi enum
