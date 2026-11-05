import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

export const createProductSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  scent_notes: z.string().min(2, 'Scent notes are required (e.g., Lavender, Vanilla, Amber)'),
  burn_time: z.string().min(2, 'Burn time is required (e.g., 45-50 Hours)'),
  price: z.number().positive('Price must be greater than 0'),
  inventory_stock: z.number().int().nonnegative('Stock cannot be negative').default(0),
  image_urls: z.array(z.string().url('Each image must be a valid URL')).min(1, 'At least 1 image is required'),
  category: z.string().min(2, 'Category is required'),
  is_featured: z.boolean().optional().default(false),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  q: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  is_featured: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('12'),
  sortBy: z.enum(['price_asc', 'price_desc', 'newest']).optional().default('newest'),
});

/**
 * List products with category filter, text search, price bounds, and pagination
 * GET /api/products
 */
export async function listProducts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { category, search, q, minPrice, maxPrice, is_featured, page, limit, sortBy } =
      req.query as any;

    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '12', 10)));
    const skip = (pageNum - 1) * limitNum;

    const searchTerm = (search || q || '').trim();

    // Build Prisma query filter
    const where: any = {};

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (is_featured !== undefined) {
      where.is_featured = is_featured === 'true' || is_featured === '1';
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { scent_notes: { contains: searchTerm, mode: 'insensitive' } },
        { category: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Determine sorting
    let orderBy: any = { created_at: 'desc' };
    if (sortBy === 'price_asc') {
      orderBy = { price: 'asc' };
    } else if (sortBy === 'price_desc') {
      orderBy = { price: 'desc' };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: pageNum,
      totalPages,
      hasMore: pageNum < totalPages,
      data: products,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get product by ID
 * GET /api/products/:id
 */
export async function getProductById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new AppError(`Candle product with ID '${id}' was not found`, 404);
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new candle product (Admin only)
 * POST /api/products
 */
export async function createProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const productData = req.body;

    const newProduct = await prisma.product.create({
      data: {
        title: productData.title.trim(),
        description: productData.description.trim(),
        scent_notes: productData.scent_notes.trim(),
        burn_time: productData.burn_time.trim(),
        price: productData.price,
        inventory_stock: productData.inventory_stock ?? 0,
        image_urls: productData.image_urls,
        category: productData.category.trim(),
        is_featured: productData.is_featured ?? false,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing candle product (Admin only)
 * PUT /api/products/:id
 */
export async function updateProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if exists
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(`Product with ID '${id}' not found`, 404);
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a product (Admin only)
 * DELETE /api/products/:id
 */
export async function deleteProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(`Product with ID '${id}' not found`, 404);
    }

    await prisma.product.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      deletedId: id,
    });
  } catch (error) {
    next(error);
  }
}
