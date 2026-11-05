import { Router } from 'express';
import {
  register,
  login,
  getMe,
  registerSchema,
  loginSchema,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.get('/me', authenticate, getMe);

export default router;
