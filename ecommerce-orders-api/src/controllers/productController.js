import { pool } from '../config/database.js';
import { redisClient } from '../config/redis.js';

export const getProducts = async (req, res) => {
  const cacheKey = 'products:all';
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.json({ source: 'cache', data: JSON.parse(cachedData) });
    }

    const result = await pool.query('SELECT * FROM products');
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(result.rows));

    res.json({ source: 'database', data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar produtos.' });
  }
};

export const createProduct = async (req, res) => {
  const { name, price, stock } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, price, stock) VALUES ($1, $2, $3) RETURNING *',
      [name, price, stock]
    );

    await redisClient.del('products:all');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar produto.' });
  }
};
