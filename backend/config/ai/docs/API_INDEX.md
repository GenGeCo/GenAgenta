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
| POST | neuroni | Crea nuova |
| PUT | neuroni/{id} | Modifica |
| DELETE | neuroni/{id} | Elimina |
| GET | neuroni/search?q=... | Cerca per nome |

Campi: vedi docs/ENTITA.md

## Connessioni (sinapsi)
| Metodo | Endpoint | Cosa fa |
|--------|----------|---------|
| GET | sinapsi | Lista tutte |
| GET | sinapsi/{id} | Dettagli una |
| POST | sinapsi | Crea nuova |
| PUT | sinapsi/{id} | Modifica |
| DELETE | sinapsi/{id} | Elimina |

Campi: vedi docs/CONNESSIONI.md

## Transazioni (vendite)
| Metodo | Endpoint | Cosa fa |
|--------|----------|---------|
| GET | vendite | Lista vendite |
| POST | vendite | Registra vendita |
| DELETE | vendite/{id} | Elimina vendita |

Campi: vedi docs/VENDITE.md

## Configurazione (solo lettura)
| Metodo | Endpoint | Cosa fa |
|--------|----------|---------|
| GET | tipi | Tipi di entità disponibili |
| GET | tipologie | Categorie/sottotipi (hanno il COLORE!) |
| GET | tipi-sinapsi | Tipi di connessione |
| GET | famiglie-prodotto | Famiglie prodotto |

Dettagli: vedi docs/CONFIGURAZIONE.md
Colori: vedi docs/COLORI.md

## Utility
| Metodo | Endpoint | Cosa fa |
|--------|----------|---------|
| GET | geocode/search?q=... | Coordinate da indirizzo |
| GET | stats | Statistiche dashboard |

## Se ricevi errore 404
FERMATI e verifica l'endpoint. NON riprovare lo stesso endpoint!
Leggi questo file per verificare gli endpoint corretti.

---
## Non trovi l'endpoint che cerchi?
1. Controlla con `read_learnings()` se ho già scoperto come fare
2. Se non c'è, prova con `explore_code(search="endpoint")`
3. Se trovi la soluzione, salvala con `save_learning("api", "titolo", "endpoint e parametri")`
4. Se non trovi, avvisa l'utente: "Non ho trovato l'endpoint per X, potresti aiutarmi?"
