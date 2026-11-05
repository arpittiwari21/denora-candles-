# 🕯️ Denora Candles Backend API

Production-ready, serverless container API for **Denora Candles** e-commerce. Built with **Node.js (TypeScript/Express)**, **PostgreSQL (Supabase / Neon DB)** with **Prisma ORM**, **Razorpay & Stripe** payments, and targeted for zero-scale deployment on **Google Cloud Run**.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Runtime** | Node.js v20+ (TypeScript 5) | Cold starts under 250ms on Cloud Run; shared JS/TS ecosystem with React/Vite frontend. |
| **Framework** | Express 4 + Helmet + Morgan + Zod | Lightweight, battle-tested, strict schema validation, structured error handling. |
| **Database** | PostgreSQL (Supabase or Neon DB) via Prisma ORM | ACID-compliant transactional safety for orders & stock, serverless connection pooling. |
| **Payments** | Razorpay (Primary - INR/UPI) & Stripe (Global) | Cryptographic webhook signature verification, automated stock deduction. |
| **Authentication** | JWT (HS256) + bcrypt (10 rounds) | Stateless authorization with `CUSTOMER` and `ADMIN` role-based access control. |
| **Deployment** | Multi-stage Docker + Google Cloud Run | Serverless scaling from 0 to N instances, zero idle cost, non-root security. |

---

## 📁 Modular Directory Structure

```
backend/
├── src/
│   ├── config/             # DB pool, environment config, payment gateways
│   │   ├── db.ts           # Prisma client singleton & connection handling
│   │   ├── env.ts          # Zod/Dotenv environment parser with validation
│   │   └── payment.ts      # Razorpay & Stripe initialization & webhook verification
│   ├── controllers/        # Business logic controllers
│   │   ├── auth.controller.ts     # Register, Login, Me, JWT issuance
│   │   ├── product.controller.ts  # Catalog filtering, search, pagination, CRUD
│   │   └── order.controller.ts    # Checkout sessions, webhooks, order history
│   ├── middleware/         # Express middlewares
│   │   ├── auth.middleware.ts     # Bearer JWT verification & optional auth
│   │   ├── role.middleware.ts     # RBAC (requireAdmin)
│   │   ├── validation.middleware.ts # Zod body & query validator
│   │   └── error.middleware.ts    # Centralized error handler & 404 catcher
│   ├── models/             # Domain types and TypeScript interfaces
│   │   └── types.ts
│   ├── routes/             # Express API route declarations
│   │   ├── auth.routes.ts
│   │   ├── product.routes.ts
│   │   ├── order.routes.ts
│   │   └── index.ts        # Route aggregator & /api/health
│   └── index.ts            # Application entrypoint & graceful shutdown
├── prisma/
│   ├── schema.prisma       # Prisma data model definition
│   ├── schema.sql          # Raw PostgreSQL DDL for Supabase / Neon SQL Editor
│   └── seed.ts             # Realistic artisanal candle catalog & demo accounts
├── Dockerfile              # Multi-stage production container build
├── .dockerignore           # Production ignore rules
├── deploy.sh               # Automated gcloud deployment script
├── package.json
└── tsconfig.json
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js 20+
- A PostgreSQL database (Neon DB, Supabase, or local Docker)

### 2. Install Dependencies & Generate Prisma Client
```bash
cd backend
npm install
npx prisma generate
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your database and gateway keys:
```bash
cp .env.example .env
```

### 4. Push Database Schema & Seed Catalog
```bash
# Push schema to PostgreSQL (Supabase / Neon)
npm run db:push

# Seed luxury candles (Midnight Oud, French Lavender, Sandalwood Amber, etc.)
npm run db:seed
```

### 5. Launch Development Server
```bash
npm run dev
```
Server runs at `http://localhost:8080`. Health check: `http://localhost:8080/api/health`.

---

## 🔌 Core API Endpoints

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register customer account (name, email, password) |
| `POST` | `/api/auth/login` | Public | Login with email and password, returns JWT |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user profile |

### 2. Products (`/api/products`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/products` | Public | Filter by category, search text, price, & paginate |
| `GET` | `/api/products/:id` | Public | Get single candle details |
| `POST` | `/api/products` | Admin | Create new candle (scent notes, burn time, stock) |
| `PUT` | `/api/products/:id` | Admin | Update product details or stock |
| `DELETE` | `/api/products/:id` | Admin | Delete product |

#### Query Parameters for `GET /api/products`:
- `category`: Filter by category (e.g. `Signature Collection`, `Aromatherapy`)
- `search` / `q`: Case-insensitive search on title, scent notes, description
- `minPrice` & `maxPrice`: Filter by budget
- `is_featured`: `true` or `false`
- `page` (default `1`) & `limit` (default `12`)
- `sortBy`: `price_asc`, `price_desc`, or `newest`

### 3. Orders & Payments (`/api/orders`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/orders/create-checkout-session` | Public/Auth | Verify stock & create Razorpay/Stripe checkout order |
| `POST` | `/api/orders/webhook` | Public | Verify cryptographic signature & decrement stock |
| `GET` | `/api/orders/my-orders` | Authenticated | Customer's order history |
| `GET` | `/api/orders` | Admin | View all customer orders with status filters |
| `PUT` | `/api/orders/:id/status` | Admin | Update fulfillment status (`SHIPPED`, `DELIVERED`) |

---

## 💳 Payment Flow & Webhook Verification

1. **Frontend initiates checkout:** Customer adds candles to cart and clicks "Proceed to Checkout".
2. **Backend validates cart:** `POST /api/orders/create-checkout-session` checks database prices and current inventory to prevent client-side price tampering.
3. **Gateway session creation:** A Razorpay Order ID or Stripe Checkout Session is generated and returned to the client.
4. **Customer pays:** Razorpay modal or Stripe Hosted Checkout finishes payment.
5. **Webhook fulfillment:** `POST /api/orders/webhook` receives the event:
   - Validates HMAC-SHA256 signature against `RAZORPAY_WEBHOOK_SECRET` or `STRIPE_WEBHOOK_SECRET`.
   - Atomically updates order to `PAID` and decrements `inventory_stock` for each ordered candle.

---

## ☁️ Google Cloud Run Deployment (Serverless / Antigravity)

### 1. Build and Deploy Script
You can run the automated script directly:
```bash
chmod +x deploy.sh
./deploy.sh
```

### 2. Manual CLI Deployment Step-by-Step

```bash
# 1. Set Google Cloud project & region
gcloud config set project [YOUR_PROJECT_ID]
export REGION="asia-south1" # Or us-central1

# 2. Enable Cloud Run & Artifact Registry
gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

# 3. Create Artifact Registry repository
gcloud artifacts repositories create denora-docker-repo \
  --repository-format=docker \
  --location=$REGION \
  --description="Docker repository for Denora Candles"

# 4. Build and push image using Cloud Build (no local Docker needed)
gcloud builds submit --tag ${REGION}-docker.pkg.dev/[YOUR_PROJECT_ID]/denora-docker-repo/denora-candles-api:latest .

# 5. Store sensitive secrets in Google Secret Manager
gcloud secrets create denora-db-url --data-file=- <<< "postgresql://..."
gcloud secrets create denora-jwt-secret --data-file=- <<< "your_jwt_secret"
gcloud secrets create denora-rzp-key --data-file=- <<< "rzp_live_..."
gcloud secrets create denora-rzp-secret --data-file=- <<< "your_razorpay_secret"

# 6. Deploy to Cloud Run (scales from 0 to N instances)
gcloud run deploy denora-candles-api \
  --image=${REGION}-docker.pkg.dev/[YOUR_PROJECT_ID]/denora-docker-repo/denora-candles-api:latest \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --port=8080 \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1 \
  --concurrency=80 \
  --set-env-vars="NODE_ENV=production,FRONTEND_URL=https://denoracandles.com" \
  --set-secrets="DATABASE_URL=denora-db-url:latest,JWT_SECRET=denora-jwt-secret:latest,RAZORPAY_KEY_ID=denora-rzp-key:latest,RAZORPAY_KEY_SECRET=denora-rzp-secret:latest"
```

### 3. Custom Domain Setup (`api.denoracandles.com`)
```bash
# Map custom domain
gcloud beta run domain-mappings create \
  --service=denora-candles-api \
  --domain=api.denoracandles.com \
  --region=$REGION
```
Add the CNAME record output by the command (e.g. `ghs.googlehosted.com.`) in your DNS provider (Cloudflare, GoDaddy, or Namecheap). Google automatically provisions and renews SSL/TLS certificates for free.
