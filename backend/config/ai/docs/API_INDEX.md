# API GenAgenta

Usa `call_api(method, endpoint, body)`.

**IMPORTANTE: NON usare prefissi come v2/ o api/ - usa solo il nome dell'endpoint!**

Esempio corretto: `call_api("GET", "tipi", {})`
Esempio SBAGLIATO: `call_api("GET", "v2/tipi", {})` ← NON FARE!

## Entità (neuroni)
| Metodo | Endpoint | Cosa fa |
|--------|----------|---------|
| GET | neuroni | Lista tutte |
| GET | neuroni/{id} | Dettagli una |
| POST | neuroni | Crea nuova (serve: nome, tipo, lat, lng) |
| PUT | neuroni/{id} | Modifica (serve: campo da cambiare) |
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
| GET | vendite | Lista vendite |
| POST | vendite | Registra vendita |
| DELETE | vendite/{id} | Elimina vendita |

## Configurazione (solo lettura)
| Metodo | Endpoint | Cosa fa |
|--------|----------|---------|
| GET | tipi | Tipi di entità disponibili |
| GET | tipologie | Categorie/sottotipi (hanno il COLORE!) |
| GET | tipi-sinapsi | Tipi di connessione |
| GET | famiglie-prodotto | Famiglie prodotto |

## COLORE ENTITÀ
Il colore di un'entità NON è un campo diretto.
Il colore dipende dalla sua **categoria** (campo `categorie`).
Ogni categoria ha un colore definito.

Per cambiare colore:
1. `call_api("GET", "tipologie", {})` → vedi categorie e colori
2. `call_api("PUT", "neuroni/{id}", { "categorie": "nuova_categoria" })`

## Utility
| Metodo | Endpoint | Cosa fa |
|--------|----------|---------|
| GET | geocode/search?q=... | Coordinate da indirizzo |
| GET | stats | Statistiche dashboard |

## Se ricevi errore 404
FERMATI e verifica l'endpoint. NON riprovare lo stesso endpoint!
