[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try {
    $response = Invoke-WebRequest -Uri "https://www.gruppogea.net/genagenta/deploy-webhook.php?token=GenAgentaDeploy2024!" -UseBasicParsing
    Write-Host "Status:" $response.StatusCode
    Write-Host "Content:" $response.Content
} catch {
    Write-Host "Errore:" $_.Exception.Message
    Write-Host "Status:" $_.Exception.Response.StatusCode.value__
}
