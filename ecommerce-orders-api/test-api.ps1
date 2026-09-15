$projectPath = "C:\projetos usando python2026\Ecommerce-orders-api 2026\ecommerce-orders-api"
Set-Location $projectPath

Write-Host "🚀 Iniciando a API em segundo plano..." -ForegroundColor Cyan
$apiProcess = Start-Process node -ArgumentList "src/server.js" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 3

try {
    Write-Host "`n--- TESTES DE FLUXO PRINCIPAL (SUCESSO) ---" -ForegroundColor Cyan

    Write-Host "`n1. Checando estoque inicial do Produto 1..." -ForegroundColor Yellow
    $p1 = Invoke-RestMethod -Uri "http://localhost:3000/api/products/1" -Method Get
    Write-Host "Estoque inicial: $($p1.quantity)"

    Write-Host "`n2. Criando pedido válido de 2 unidades..." -ForegroundColor Yellow
    $orderBody = @{ items = @( @{ productId = 1; quantity = 2 } ) } | ConvertTo-Json -Depth 4
    $order = Invoke-RestMethod -Uri "http://localhost:3000/api/orders" -Method Post -Body $orderBody -ContentType "application/json"
    Write-Host "Pedido criado! ID: $($order.order.id)"

    Write-Host "`n--- TESTES DE CENÁRIOS DE ERRO E BORDA ---" -ForegroundColor Cyan

    Write-Host "`n3. [ERRO ESPERADO] Pedir quantidade maior que o estoque (Ex: 999)..." -ForegroundColor Yellow
    try {
        $overStockBody = @{ items = @( @{ productId = 1; quantity = 999 } ) } | ConvertTo-Json -Depth 4
        Invoke-RestMethod -Uri "http://localhost:3000/api/orders" -Method Post -Body $overStockBody -ContentType "application/json"
        Write-Host "❌ Falha: A API permitiu criar pedido sem estoque!" -ForegroundColor Red
    } catch {
        Write-Host "✅ Sucesso: API bloqueou compra sem estoque suficiente (400 Bad Request)." -ForegroundColor Green
    }

    Write-Host "`n4. [ERRO ESPERADO] Criar pedido para produto inexistente (ID: 999)..." -ForegroundColor Yellow
    try {
        $invalidProductBody = @{ items = @( @{ productId = 999; quantity = 1 } ) } | ConvertTo-Json -Depth 4
        Invoke-RestMethod -Uri "http://localhost:3000/api/orders" -Method Post -Body $invalidProductBody -ContentType "application/json"
        Write-Host "❌ Falha: A API aceitou produto inexistente!" -ForegroundColor Red
    } catch {
        Write-Host "✅ Sucesso: API rejeitou produto inexistente (404 Not Found)." -ForegroundColor Green
    }

    Write-Host "`n5. [ERRO ESPERADO] Cancelar pedido inexistente (ID: 999)..." -ForegroundColor Yellow
    try {
        Invoke-RestMethod -Uri "http://localhost:3000/api/orders/999/cancel" -Method Patch
        Write-Host "❌ Falha: A API cancelou um pedido que não existe!" -ForegroundColor Red
    } catch {
        Write-Host "✅ Sucesso: API recusou cancelamento de pedido inexistente (404 Not Found)." -ForegroundColor Green
    }

    Write-Host "`n6. Limpando dados do teste (Cancelando pedido criado no passo 2)..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri "http://localhost:3000/api/orders/$($order.order.id)/cancel" -Method Patch | Out-Null
    
    $p1Final = Invoke-RestMethod -Uri "http://localhost:3000/api/products/1" -Method Get
    Write-Host "Estoque restaurado para: $($p1Final.quantity)"

    Write-Host "`n✅ Bateria de testes de sucesso e cenários de erro concluída!" -ForegroundColor Green
}
catch {
    Write-Host "`n❌ Ocorreu uma falha inesperada na suíte de testes: $_" -ForegroundColor Red
}
finally {
    Write-Host "`n🛑 Encerrando o servidor Node.js..." -ForegroundColor Cyan
    Stop-Process -Id $apiProcess.Id -Force
}
