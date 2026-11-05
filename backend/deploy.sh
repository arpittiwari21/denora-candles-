#!/usr/bin/env bash
# =========================================================================
# Google Cloud Run Deployment Script for Denora Candles Backend API
# Architecture: Serverless Container (Antigravity Scale 0 -> N)
# =========================================================================

set -e # Exit immediately if a command exits with a non-zero status

# -------------------------------------------------------------------------
# Configuration (Automatically detects active gcloud project)
# -------------------------------------------------------------------------
ACTIVE_GCP_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
PROJECT_ID=${GCP_PROJECT_ID:-${ACTIVE_GCP_PROJECT:-"plucky-tract-462407-c7"}}
REGION=${GCP_REGION:-"asia-south1"} # Mumbai (recommended for India) or us-central1
SERVICE_NAME="denora-candles-api"
REPOSITORY_NAME="denora-docker-repo"
IMAGE_TAG="latest"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}:${IMAGE_TAG}"

echo "========================================================================="
echo "🕯️  Deploying Denora Candles Backend API to Google Cloud Run"
echo "Project ID  : ${PROJECT_ID}"
echo "Region      : ${REGION}"
echo "Service     : ${SERVICE_NAME}"
echo "Image URI   : ${IMAGE_URI}"
echo "========================================================================="

# Step 1: Set GCP Active Project
echo ""
echo "🔹 Step 1: Setting GCP project..."
gcloud config set project "${PROJECT_ID}"

# Step 2: Enable Required Google Cloud Services
echo ""
echo "🔹 Step 2: Enabling Cloud Run, Artifact Registry & Secret Manager APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com

# Step 3: Create Artifact Registry Repository (if not already existing)
echo ""
echo "🔹 Step 3: Verifying Artifact Registry repository..."
if ! gcloud artifacts repositories describe "${REPOSITORY_NAME}" --location="${REGION}" >/dev/null 2>&1; then
  echo "Creating repository '${REPOSITORY_NAME}' in '${REGION}'..."
  gcloud artifacts repositories create "${REPOSITORY_NAME}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Docker repository for Denora Candles serverless containers"
else
  echo "Repository '${REPOSITORY_NAME}' already exists."
fi

# Step 4: Ensure Secrets Exist in Secret Manager
echo ""
echo "🔹 Step 4: Checking Secret Manager secrets..."
ensure_secret() {
  local sec_name=$1
  local def_val=$2
  if ! gcloud secrets describe "${sec_name}" >/dev/null 2>&1; then
    echo "Creating placeholder secret '${sec_name}'..."
    echo -n "${def_val}" | gcloud secrets create "${sec_name}" --data-file=- --replication-policy="automatic"
  else
    echo "Secret '${sec_name}' already exists."
  fi
}

ensure_secret "denora-db-url" "postgresql://postgres:postgres@localhost:5432/postgres"
ensure_secret "denora-jwt-secret" "denora_production_jwt_secret_$(openssl rand -hex 16 2>/dev/null || echo '2026_denora_secret_key')"
ensure_secret "denora-rzp-key" "rzp_test_placeholder"
ensure_secret "denora-rzp-secret" "rzp_secret_placeholder"
ensure_secret "denora-rzp-webhook" "rzp_webhook_placeholder"

# Step 5: Build & Push Image via Google Cloud Build (no local Docker daemon required)
echo ""
echo "🔹 Step 5: Submitting container build to Google Cloud Build..."
gcloud builds submit --tag "${IMAGE_URI}" .

# Step 6: Deploy to Google Cloud Run (Serverless Scale 0 -> N)
echo ""
echo "🔹 Step 6: Deploying service to Google Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE_URI}" \
  --platform=managed \
  --region="${REGION}" \
  --allow-unauthenticated \
  --port=8080 \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1 \
  --concurrency=80 \
  --timeout=60s \
  --set-env-vars="NODE_ENV=production,FRONTEND_URL=https://denoracandles.com,PAYMENT_GATEWAY=razorpay" \
  --set-secrets="DATABASE_URL=denora-db-url:latest,JWT_SECRET=denora-jwt-secret:latest,RAZORPAY_KEY_ID=denora-rzp-key:latest,RAZORPAY_KEY_SECRET=denora-rzp-secret:latest,RAZORPAY_WEBHOOK_SECRET=denora-rzp-webhook:latest"

# Step 6: Fetch Deployed Service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --platform=managed --region="${REGION}" --format="value(status.url)")

echo ""
echo "========================================================================="
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "Service URL : ${SERVICE_URL}"
echo "Health Check: ${SERVICE_URL}/api/health"
echo "========================================================================="
echo ""
echo "To map a custom domain (e.g. api.denoracandles.com), execute:"
echo "gcloud beta run domain-mappings create --service=${SERVICE_NAME} --domain=api.denoracandles.com --region=${REGION}"
