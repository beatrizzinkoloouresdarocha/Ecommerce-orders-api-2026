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
    await client.query('BEGIN');

    const productResult = await client.query(
      'SELECT stock, price FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    );

    const product = productResult.rows[0];

    if (!product || product.stock < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Estoque insuficiente.' });
    }

    await client.query(
      'UPDATE products SET stock = stock - $1 WHERE id = $2',
      [quantity, productId]
    );

    const total = product.price * quantity;
    const orderResult = await client.query(
      'INSERT INTO orders (user_id, total, status) VALUES ($1, $2, $3) RETURNING id',
      [userId, total, 'PAID']
    );

    await client.query('COMMIT');
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
