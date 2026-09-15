const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// --- PRODUTOS ---

app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, price, quantity } = req.body;
    const product = await prisma.product.create({
      data: { name, price: Number(price), quantity: Number(quantity) },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, price, quantity } = req.body;
    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: { name, price: Number(price), quantity: Number(quantity) },
    });
    res.json(product);
  } catch (error) {
    res.status(404).json({ message: 'Produto não encontrado' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await prisma.product.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ message: 'Produto removido com sucesso' });
  } catch (error) {
    res.status(404).json({ message: 'Produto não encontrado' });
  }
});

// --- PEDIDOS ---

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: true },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'O pedido deve conter itens' });
    }

    const order = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) throw new Error(`NOT_FOUND:${item.productId}`);
        if (product.quantity < item.quantity) throw new Error(`OUT_OF_STOCK:${product.name}`);

        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: product.quantity - item.quantity },
        });
      }

      return await tx.order.create({
        data: {
          status: 'CONFIRMED',
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
            })),
          },
        },
        include: { items: true },
      });
    });

    res.status(201).json({ message: 'Pedido criado com sucesso', order });
  } catch (error) {
    if (error.message.startsWith('NOT_FOUND')) return res.status(404).json({ message: 'Produto não encontrado' });
    if (error.message.startsWith('OUT_OF_STOCK')) return res.status(400).json({ message: 'Estoque insuficiente' });
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: Number(req.params.id) },
      data: { status },
      include: { items: true },
    });
    res.json({ message: 'Status atualizado com sucesso', order });
  } catch (error) {
    res.status(404).json({ message: 'Pedido não encontrado' });
  }
});

app.patch('/api/orders/:id/cancel', async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });
    if (order.status === 'CANCELED') return res.status(400).json({ message: 'Pedido já está cancelado' });

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELED' },
      });
    });

    res.json({ message: 'Pedido cancelado e estoque estornado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:3000`);
});