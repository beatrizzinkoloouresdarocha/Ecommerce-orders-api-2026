import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

process.exit = (code) => {
  console.warn(`[AVISO] process.exit(${code}) bloqueado para manter o servidor online.`);
};

const app = express();
app.use(express.json());

// Banco de dados em memória para testes
const products = [
  { id: 1, name: "Notebook Gamer", price: 4500.00, quantity: 10 },
  { id: 2, name: "Mouse Vertical", price: 150.00, quantity: 25 }
];

const orders = [];

// ==========================================
// ROTAS DE PRODUTOS
// ==========================================

// Listar todos os produtos
app.get('/api/products', (req, res) => {
  res.json(products);
});

// Buscar produto por ID
app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ message: "Produto não encontrado" });
  res.json(product);
});

// Criar novo produto
app.post('/api/products', (req, res) => {
  const { name, price, quantity } = req.body;
  if (!name || price == null) {
    return res.status(400).json({ message: "Nome e preço são obrigatórios" });
  }
  const newProduct = {
    id: products.length ? Math.max(...products.map(p => p.id)) + 1 : 1,
    name,
    price: parseFloat(price),
    quantity: parseInt(quantity) || 0
  };
  products.push(newProduct);
  res.status(201).json({ message: "Produto criado com sucesso", product: newProduct });
});

// Atualizar produto
app.put('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ message: "Produto não encontrado" });

  const { name, price, quantity } = req.body;
  if (name !== undefined) product.name = name;
  if (price !== undefined) product.price = parseFloat(price);
  if (quantity !== undefined) product.quantity = parseInt(quantity);

  res.json({ message: "Produto atualizado com sucesso", product });
});

// Deletar produto
app.delete('/api/products/:id', (req, res) => {
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ message: "Produto não encontrado" });

  products.splice(index, 1);
  res.json({ message: "Produto removido com sucesso" });
});

// ==========================================
// ROTAS DE PEDIDOS (ORDERS)
// ==========================================

// Listar todos os pedidos
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

// Buscar pedido por ID
app.get('/api/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ message: "Pedido não encontrado" });
  res.json(order);
});

// Criar um novo pedido
app.post('/api/orders', (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "O pedido deve conter ao menos um item em 'items'" });
  }

  let totalAmount = 0;
  const orderItems = [];

  for (const item of items) {
    const product = products.find(p => p.id === parseInt(item.productId));

    if (!product) {
      return res.status(404).json({ message: `Produto ID ${item.productId} não encontrado` });
    }

    if (product.quantity < item.quantity) {
      return res.status(400).json({ 
        message: `Estoque insuficiente para '${product.name}'. Disponível: ${product.quantity}` 
      });
    }

    // Abate do estoque
    product.quantity -= item.quantity;

    const itemTotal = product.price * item.quantity;
    totalAmount += itemTotal;

    orderItems.push({
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      quantity: item.quantity,
      subtotal: itemTotal
    });
  }

  const newOrder = {
    id: orders.length + 1,
    createdAt: new Date().toISOString(),
    status: "CONFIRMED",
    items: orderItems,
    totalAmount
  };

  orders.push(newOrder);
  res.status(201).json({ message: "Pedido realizado com sucesso!", order: newOrder });
});

// Atualizar status de um pedido
app.patch('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const order = orders.find(o => o.id === parseInt(req.params.id));

  if (!order) return res.status(404).json({ message: "Pedido não encontrado" });
  if (!status) return res.status(400).json({ message: "O campo 'status' é obrigatório" });

  order.status = status;
  res.json({ message: "Status do pedido atualizado com sucesso", order });
});

// Cancelar pedido e estornar itens ao estoque
app.patch('/api/orders/:id/cancel', (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ message: "Pedido não encontrado" });
  if (order.status === "CANCELED") return res.status(400).json({ message: "Este pedido já está cancelado" });

  // Devolve as quantidades ao estoque
  for (const item of order.items) {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      product.quantity += item.quantity;
    }
  }

  order.status = "CANCELED";
  res.json({ message: "Pedido cancelado e estoque estornado com sucesso", order });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

setInterval(() => {}, 60000);
