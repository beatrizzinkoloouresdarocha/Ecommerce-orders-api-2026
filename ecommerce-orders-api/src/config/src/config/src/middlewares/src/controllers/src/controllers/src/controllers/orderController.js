import { pool } from '../config/database.js';
import { redisClient } from '../config/redis.js';

export const checkoutOrder = async (req, res) => {
  const { productId, quantity, paymentConfirmed } = req.body;
  const userId = req.user.id;

  if (!paymentConfirmed) {
    return res.status(400).json({ message: 'Pagamento não foi confirmado.' });
  }

  const client = await pool.connect();

  try {
    // Início da Transação
    await client.query('BEGIN');

    // Bloqueia e verifica o estoque atual do produto (FOR UPDATE garante lock de linha)
    const productResult = await client.query(
      'SELECT stock, price FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    );

    const product = productResult.rows[0];

    if (!product || product.stock < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Estoque insuficiente.' });
    }

    // Deduz o estoque
    await client.query(
      'UPDATE products SET stock = stock - $1 WHERE id = $2',
      [quantity, productId]
    );

    // Registra o pedido
    const total = product.price * quantity;
    const orderResult = await client.query(
      'INSERT INTO orders (user_id, total, status) VALUES ($1, $2, $3) RETURNING id',
      [userId, total, 'PAID']
    );

    // Confirma a transação
    await client.query('COMMIT');

    // Limpa o cache de produtos atualizados
    await redisClient.del('products:all');

    res.status(201).json({
      message: 'Pedido realizado com sucesso!',
      orderId: orderResult.rows[0].id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erro ao processar transação de pedido.' });
  } finally {
    client.release();
  }
};