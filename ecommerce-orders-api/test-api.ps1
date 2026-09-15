$projectPath = "C:\projetos usando python2026\Ecommerce-orders-api 2026\ecommerce-orders-api"
Set-Location $projectPath

Write-Host "🚀 Iniciando a API em segundo plano..." -ForegroundColor Cyan
$apiProcess = Start-Process node -ArgumentList "src/server.js" -PassThru -WindowStyle Hidden

# Aguarda a inicialização do servidor na porta 3000
Start-Sleep -Seconds 3

try {
    Write-Host "`n1. Checando estoque inicial do Produto 1..." -ForegroundColor Yellow
    $p1 = Invoke-RestMethod -Uri "http://localhost:3000/api/products/1" -Method Get
    Write-Host "Estoque inicial: $($p1.quantity)"

    Write-Host "`n2. Criando pedido de 2 unidades do Produto 1..." -ForegroundColor Yellow
    $orderBody = @{ items = @( @{ productId = 1; quantity = 2 } ) } | ConvertTo-Json -Depth 4
    $order = Invoke-RestMethod -Uri "http://localhost:3000/api/orders" -Method Post -Body $orderBody -ContentType "application/json"
    Write-Host "Pedido criado! ID: $($order.order.id) | Status: $($order.order.status)"

    Write-Host "`n3. Atualizando status do pedido para SHIPPED..." -ForegroundColor Yellow
    $statusBody = @{ status = "SHIPPED" } | ConvertTo-Json
    $updatedOrder = Invoke-RestMethod -Uri "http://localhost:3000/api/orders/1/status" -Method Patch -Body $statusBody -ContentType "application/json"
    Write-Host "Novo Status: $($updatedOrder.order.status)"

    Write-Host "`n4. Cancelando o pedido ID 1 e estornando estoque..." -ForegroundColor Yellow
    $canceledOrder = Invoke-RestMethod -Uri "http://localhost:3000/api/orders/1/cancel" -Method Patch
    Write-Host "Mensagem: $($canceledOrder.message)"

    Write-Host "`n5. Verificando se o estoque retornou ao valor original..." -ForegroundColor Yellow
    $p1Final = Invoke-RestMethod -Uri "http://localhost:3000/api/products/1" -Method Get
    Write-Host "Estoque final: $($p1Final.quantity)"

    Write-Host "`n✅ Todos os testes foram executados com sucesso!" -ForegroundColor Green
}
catch {
    Write-Host "`n❌ Ocorreu um erro durante a execução dos testes: $_" -ForegroundColor Red
}
finally {
    Write-Host "`n🛑 Encerrando o servidor Node.js..." -ForegroundColor Cyan
    Stop-Process -Id $apiProcess.Id -Force
}
