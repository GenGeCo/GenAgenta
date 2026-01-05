# Riparti da qui - Debug 500 error get_user_actions

## Stato attuale
Stiamo debuggando un errore 500 che avviene quando l'AI (Agea) chiama il tool `get_user_actions()`.

## Cosa abbiamo scoperto
1. **Il tool funziona** - test-real-tool.php conferma che `tool_getUserActions()` esegue correttamente
2. **Il bug è nel loop Gemini** - dopo che il tool ritorna, la SECONDA chiamata a Gemini fallisce
3. **Gemini restituisce errore** - ma non sappiamo ancora quale

## Ultimo deploy
Ho appena deployato codice che:
- Aggiunge debug logging PRIMA di ogni chiamata Gemini (`GEMINI_API_REQUEST`)
- Logga l'errore esatto quando Gemini fallisce (`GEMINI_API_ERROR`)
- Restituisce HTTP 200 con messaggio invece di 500

## Prossimo step
1. Chiedi all'AI "riesci a vedere dove ho cliccato?"
2. Guarda il debug log su https://www.gruppogea.net/genagenta/ai-debug.php
3. Cerca `GEMINI_API_ERROR` - mostrerà l'errore esatto di Gemini
4. Con quell'errore possiamo capire cosa non va nel formato del function response

## File rilevanti
- `backend/api/ai/chat.php` - loop Gemini (linee 1877-1990)
- `backend/api/ai/tools.php` - tool_getUserActions() (linee 1838-1924)
- `backend/api/ai/test-real-tool.php` - test endpoint

## Ipotesi probabile
Il formato del `functionResponse` che mandiamo a Gemini potrebbe essere sbagliato.
Linee 1970-1988 di chat.php costruiscono la risposta.
