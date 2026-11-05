import { Router } from 'express';
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from '../controllers/product.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';

const router = Router();

// Public routes
router.get('/', validateQuery(productQuerySchema), listProducts);
router.get('/:id', getProductById);

// Admin-only routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  validateBody(createProductSchema),
  createProduct
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validateBody(updateProductSchema),
  updateProduct
);

router.delete('/:id', authenticate, requireAdmin, deleteProduct);

export default router;
