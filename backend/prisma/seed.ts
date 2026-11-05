import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Denora Candles database seed...');

  // 1. Seed Users (Admin & Customer)
  const passwordSalt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@Denora2026!', passwordSalt);
  const customerPasswordHash = await bcrypt.hash('Customer@123', passwordSalt);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@denoracandles.com' },
    update: {},
    create: {
      name: 'Denora Admin',
      email: 'admin@denoracandles.com',
      password_hash: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@denoracandles.com' },
    update: {},
    create: {
      name: 'Aarav Sharma',
      email: 'customer@denoracandles.com',
      password_hash: customerPasswordHash,
      role: 'CUSTOMER',
    },
  });

  console.log(`👤 Users seeded:`);
  console.log(`   Admin: ${admin.email} (Password: Admin@Denora2026!)`);
  console.log(`   Customer: ${customer.email} (Password: Customer@123)`);

  // 2. Seed Candle Catalog
  const candles = [
    {
      title: 'Midnight Oud & Smoked Vanilla',
      description:
        'An opulent blend of dark Cambodian oud, rich Bourbon vanilla, and charred cedarwood. Hand-poured with pure soy wax and a crackling wooden wick.',
      scent_notes: 'Top: Smoked Birch, Bergamot | Heart: Cambodian Oud, Amber | Base: Bourbon Vanilla, Patchouli',
      burn_time: '55-60 Hours',
      price: 1299.0,
      inventory_stock: 45,
      category: 'Signature Collection',
      is_featured: true,
      image_urls: [
        'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1596433809252-260c2745dfdd?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      title: 'French Lavender & Wild Chamomile',
      description:
        'Calm your senses after a long day. Pure Provencal lavender essential oil harmonized with delicate chamomile petals and comforting warm cashmere.',
      scent_notes: 'Top: French Lavender, Mandarin | Heart: Chamomile, White Tea | Base: Soft Musk, Cashmere',
      burn_time: '45-50 Hours',
      price: 999.0,
      inventory_stock: 70,
      category: 'Aromatherapy',
      is_featured: true,
      image_urls: [
        'https://images.unsplash.com/photo-1572726729207-a78d6feb18d7?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1543257580-7269da773bf5?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      title: 'Sandalwood, Amber & Cardamom',
      description:
        'A warm, grounding tribute to heritage perfumery. Mysore sandalwood fused with golden resinous amber, crushed green cardamom pods, and tonka bean.',
      scent_notes: 'Top: Green Cardamom, Clove | Heart: Mysore Sandalwood, Orris | Base: Golden Amber, Tonka Bean',
      burn_time: '60 Hours',
      price: 1499.0,
      inventory_stock: 30,
      category: 'Signature Collection',
      is_featured: true,
      image_urls: [
        'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      title: 'Bergamot, Sea Salt & White Sage',
      description:
        'Crisp coastal breeze meets purifying desert sage. An energizing daytime scent designed to clear mental fog and revitalize living spaces.',
      scent_notes: 'Top: Calabrian Bergamot, Sea Spray | Heart: White Sage, Blue Eucalyptus | Base: Driftwood, Clean Musk',
      burn_time: '45 Hours',
      price: 899.0,
      inventory_stock: 55,
      category: 'Fresh & Uplifting',
      is_featured: false,
      image_urls: [
        'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      title: 'Dark Plum, Cashmere & Spiced Oak',
      description:
        'Intimate and sultry. Ripe dark plums steeped in aged oak barrels with hints of cinnamon bark, tobacco leaf, and velvety cashmere.',
      scent_notes: 'Top: Black Plum, Pink Peppercorn | Heart: Cinnamon Leaf, Violet | Base: Dark Oak, Vanilla Resin',
      burn_time: '55 Hours',
      price: 1349.0,
      inventory_stock: 25,
      category: 'Festive Edition',
      is_featured: true,
      image_urls: [
        'https://images.unsplash.com/photo-1570823635306-250abb06d4b3?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      title: 'Neroli Blossom & Golden Honey',
      description:
        'Sunlit Mediterranean orchards in full bloom. Sweet orange blossom, crystalline neroli, and a golden drizzle of wildflower honey.',
      scent_notes: 'Top: Neroli, Tangerine Blossom | Heart: Jasmine Sambac, Honeycomb | Base: Vetiver, Warm Solar Notes',
      burn_time: '48 Hours',
      price: 1099.0,
      inventory_stock: 40,
      category: 'Botanical Garden',
      is_featured: false,
      image_urls: [
        'https://images.unsplash.com/photo-1602874801007-bd458bb1b8b8?auto=format&fit=crop&w=800&q=80',
      ],
    },
  ];

  for (const candle of candles) {
    const existing = await prisma.product.findFirst({
      where: { title: candle.title },
    });

    if (!existing) {
      await prisma.product.create({ data: candle });
      console.log(`🕯️  Product created: ${candle.title}`);
    } else {
      console.log(`ℹ️  Product already exists: ${candle.title}`);
    }
  }

  console.log('✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
