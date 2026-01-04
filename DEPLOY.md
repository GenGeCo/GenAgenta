# Deploy GenAgenta

## Procedura Standard

1. **Build frontend** (se modificato):
   ```bash
   cd frontend && npm run build
   ```

2. **Commit e push**:
   ```bash
   git add -A && git commit -m "Descrizione" && git push origin main
   ```

3. **Trigger deploy sul server**:
   ```bash
   powershell -ExecutionPolicy Bypass -File deploy.ps1
   ```

---

## Webhook Deploy

**URL**: `https://www.gruppogea.net/genagenta/deploy-webhook.php?token=GenAgentaDeploy2024!`

Il webhook esegue `git pull origin main` sul server.

### Chiamata Manuale

**PowerShell (Windows)**:
```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
(Invoke-WebRequest -Uri 'https://www.gruppogea.net/genagenta/deploy-webhook.php?token=GenAgentaDeploy2024!' -UseBasicParsing).Content
```

**Bash/curl**:
```bash
curl -s "https://www.gruppogea.net/genagenta/deploy-webhook.php?token=GenAgentaDeploy2024!"
```

### Risposte

- `Deploy completato!` = Successo
- `Accesso negato` = Webhook bloccato, serve deploy manuale

---

## Deploy Manuale (Fallback)

Se webhook bloccato, accedere al server e:

```bash
cd /path/to/genagenta
git pull origin main
```

---

## Troubleshooting

### Webhook "Accesso negato"
- IP non autorizzato nel server
- Token modificato
- **Soluzione**: deploy manuale via SSH/FTP

### Modifiche non visibili
1. Ctrl+F5 (hard refresh browser)
2. Verificare che `frontend/dist/` sia stato pushato
3. Verificare git pull sul server

### Build fallisce
```bash
cd frontend
rm -rf node_modules
npm install
npm run build
```

---

## File di Configurazione

Il file `deploy.ps1` nella root gestisce la chiamata webhook con TLS 1.2.
