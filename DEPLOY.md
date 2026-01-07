# Deploy GenAgenta, per claude NON MODIFICARE MAI QUESTO FILE

## Procedura

1. **Build frontend** (se modificato):
   ```
   cd frontend && npm run build
   ```

2. **Commit e push**:
   ```
   git add -A && git commit -m "Descrizione" && git push origin main
   ```

3. **Trigger deploy sul server**:
   ```
   powershell -ExecutionPolicy Bypass -File deploy.ps1
   ```

## Note
- Il webhook sul server fa `git pull origin main`
- URL: `https://www.gruppogea.net/genagenta/deploy-webhook.php?token=GenAgentaDeploy2024!`
- Il file `deploy.ps1` nella root gestisce la chiamata con TLS 1.2
