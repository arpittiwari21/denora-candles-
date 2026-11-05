import { PrismaClient } from '@prisma/client';
import { config } from './env';

// Prevent multiple instances of Prisma Client in development with hot reload
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Ensure Prisma has a valid DATABASE_URL in environment if not already loaded
if (!process.env.DATABASE_URL && config.DATABASE_URL) {
  process.env.DATABASE_URL = config.DATABASE_URL;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    datasourceUrl: config.DATABASE_URL || undefined,
    log: config.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (config.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL database connected successfully via Prisma');
    await autoMigrateAndSeed();
  } catch (error) {
    console.error('❌ Database connection error:', error);
    // In production container on Cloud Run / Render, keep running or fail fast based on configuration
  }
}

async function autoMigrateAndSeed(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('CUSTOMER', 'ADMIN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE order_status AS ENUM ('PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role user_role NOT NULL DEFAULT 'CUSTOMER',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        scent_notes TEXT NOT NULL,
        burn_time VARCHAR(50) NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        inventory_stock INTEGER NOT NULL DEFAULT 0,
        image_urls TEXT[] NOT NULL DEFAULT '{}',
        category VARCHAR(100) NOT NULL,
        is_featured BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        total_amount NUMERIC(10, 2) NOT NULL,
        shipping_address JSONB NOT NULL,
        payment_status payment_status NOT NULL DEFAULT 'PENDING',
        order_status order_status NOT NULL DEFAULT 'PROCESSING',
        payment_id VARCHAR(255),
        payment_gateway VARCHAR(50) NOT NULL DEFAULT 'razorpay',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        price NUMERIC(10, 2) NOT NULL
      );
    `);
    console.log('✅ PostgreSQL database schema verified and tables ready.');

    const count = await prisma.product.count();
    if (count === 0) {
      console.log('🌱 No products found. Auto-seeding initial Denora luxury candle catalog...');
      await prisma.product.createMany({
        data: [
          {
            title: 'Midnight Oud & Smoked Vanilla',
            description: 'An opulent blend of dark Cambodian oud, rich Bourbon vanilla, and charred cedarwood.',
            scent_notes: 'Smoked Birch, Bergamot, Cambodian Oud, Bourbon Vanilla',
            burn_time: '55-60 Hours',
            price: 1299.0,
            inventory_stock: 45,
            category: 'Signature Collection',
            is_featured: true,
            image_urls: ['https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80'],
          },
          {
            title: 'French Lavender & Wild Chamomile',
            description: 'Pure Provencal lavender essential oil harmonized with delicate chamomile petals and warm cashmere.',
            scent_notes: 'French Lavender, Mandarin, Chamomile, White Tea, Cashmere',
            burn_time: '45-50 Hours',
            price: 999.0,
            inventory_stock: 70,
            category: 'Aromatherapy',
            is_featured: true,
            image_urls: ['https://images.unsplash.com/photo-1572726729207-a78d6feb18d7?auto=format&fit=crop&w=800&q=80'],
          },
          {
            title: 'Sandalwood, Amber & Cardamom',
            description: 'A warm, grounding tribute to heritage perfumery. Mysore sandalwood fused with golden amber and cardamom.',
            scent_notes: 'Green Cardamom, Clove, Mysore Sandalwood, Golden Amber',
            burn_time: '60 Hours',
            price: 1499.0,
            inventory_stock: 30,
            category: 'Signature Collection',
            is_featured: true,
            image_urls: ['https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=800&q=80'],
          },
          {
            title: 'Bergamot, Sea Salt & White Sage',
            description: 'Crisp coastal breeze meets purifying desert sage. An energizing daytime scent.',
            scent_notes: 'Calabrian Bergamot, Sea Spray, White Sage, Driftwood',
            burn_time: '45 Hours',
            price: 899.0,
            inventory_stock: 55,
            category: 'Fresh & Uplifting',
            is_featured: false,
            image_urls: ['https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80'],
          },
        ],
      });
      console.log('✨ Candle catalog initialized successfully.');
    }
  } catch (err) {
    console.warn('ℹ️ Auto-migration notice:', (err as any).message);
  }
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
  console.log('PostgreSQL database disconnected');
}
