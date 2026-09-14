import express from 'express';
import dotenv from 'dotenv';
import { register, login } from './controllers/authController.js';
import { getProducts, createProduct } from './controllers/productController.js';
import { checkoutOrder } from './controllers/orderController.js';
import { authenticateToken, authorizeRoles } from './middlewares/auth.js';

dotenv.config();

const app = express();
app.use(express.json());

// Rotas públicas
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/products', getProducts);

// Rotas protegidas (Usuário comum)
app.post('/api/orders/checkout', authenticateToken, checkoutOrder);

// Rotas administrativas (Apenas Admin)
app.post('/api/products', authenticateToken, authorizeRoles('admin'), createProduct);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));