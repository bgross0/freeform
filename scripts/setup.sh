#!/bin/bash
set -e

echo "🚀 Freeform Setup"
echo "=================="
echo ""

# Check for wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Install with: npm install -g wrangler"
    exit 1
fi

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo "📝 Please log in to Cloudflare:"
    wrangler login
fi

echo ""
echo "📧 Email Configuration"
echo "----------------------"
read -p "FROM_EMAIL (sender, must be verified in Brevo): " FROM_EMAIL
read -p "FROM_NAME (sender display name): " FROM_NAME
read -p "TO_EMAIL (where to receive submissions): " TO_EMAIL

echo ""
echo "☁️  Creating Cloudflare resources..."

# Create D1 database
echo "Creating D1 database..."
D1_OUTPUT=$(wrangler d1 create freeform-db 2>&1)
D1_ID=$(echo "$D1_OUTPUT" | grep -oP 'database_id = "\K[^"]+' || echo "$D1_OUTPUT" | grep -oP '"database_id": "\K[^"]+')

if [ -z "$D1_ID" ]; then
    echo "❌ Failed to create D1 database"
    echo "$D1_OUTPUT"
    exit 1
fi
echo "✅ D1 database created: $D1_ID"

# Create KV namespace
echo "Creating KV namespace..."
KV_OUTPUT=$(wrangler kv namespace create FREEFORM_KV 2>&1)
KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+')

if [ -z "$KV_ID" ]; then
    echo "❌ Failed to create KV namespace"
    echo "$KV_OUTPUT"
    exit 1
fi
echo "✅ KV namespace created: $KV_ID"

# Create queues
echo "Creating queues..."
wrangler queues create freeform-email 2>&1 || true
wrangler queues create freeform-webhook 2>&1 || true
echo "✅ Queues created"

# Generate wrangler.toml
echo ""
echo "📝 Generating wrangler.toml..."

cat > wrangler.toml << EOF
name = "freeform"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "freeform-db"
database_id = "$D1_ID"

[[kv_namespaces]]
binding = "KV"
id = "$KV_ID"

[[queues.producers]]
binding = "EMAIL_QUEUE"
queue = "freeform-email"

[[queues.consumers]]
queue = "freeform-email"
max_batch_size = 10
max_retries = 3

[[queues.producers]]
binding = "WEBHOOK_QUEUE"
queue = "freeform-webhook"

[[queues.consumers]]
queue = "freeform-webhook"
max_batch_size = 10
max_retries = 5

[vars]
ENVIRONMENT = "production"
FROM_EMAIL = "$FROM_EMAIL"
FROM_NAME = "$FROM_NAME"
TO_EMAIL = "$TO_EMAIL"
EOF

echo "✅ wrangler.toml created"

# Run migrations
echo ""
echo "🗄️  Running database migrations..."
wrangler d1 migrations apply freeform-db --remote
echo "✅ Migrations applied"

# Prompt for secrets
echo ""
echo "🔐 Setting up secrets..."
echo "Enter your Brevo API key (get from app.brevo.com > Settings > SMTP & API):"
wrangler secret put BREVO_API_KEY

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Deploy: npm run deploy"
echo "  2. Test: curl https://your-worker.workers.dev/health"
echo "  3. Submit a form to verify your email"
echo ""
