import { Request } from 'express';

export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  rawBody?: Buffer;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface CartItemInput {
  productId: string;
  quantity: number;
}

export interface CreateCheckoutInput {
  items: CartItemInput[];
  shippingAddress: ShippingAddress;
}

export interface ProductFilterQuery {
  category?: string;
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  isFeatured?: string;
  page?: string;
  limit?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'newest';
}
