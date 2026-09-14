import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

export const register = async (req, res) => {
  const { name, email, password, role } = req.body;
  
  try {
    const hashedPassword = await argon2.hash(password);
    const userRole = role === 'admin' ? 'admin' : 'user';

    const result = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, userRole]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar usuário.' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await argon2.verify(user.password, password))) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao realizar login.' });
  }
};