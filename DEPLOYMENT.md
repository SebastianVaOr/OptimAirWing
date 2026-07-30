# OptimAirWing — Guía de Despliegue a Producción

## Prerrequisitos

- Kubernetes cluster (GKE, EKS, o minikube)
- `kubectl` + `gcloud` (o `aws`) configurados
- Docker + `docker push` a GHCR
- Dominio: `optimairwing.app` y `api.optimairwing.app`
- Stripe account con productos/precios creados
- Resend API key para emails
- Sentry DSN

## Paso 1: Variables de Entorno

Crea `.env` (NUNCA commitees):

```bash
NODE_ENV=production
JWT_SECRET=<openssl rand -hex 64>
ADMIN_SECRET_KEY=<openssl rand -hex 32>
API_KEY=<openssl rand -hex 32>

PGHOST=localhost
PGPORT=5432
PGDATABASE=optimairwing
PGUSER=optimairwing
PGPASSWORD=<openssl rand -hex 32>

REDIS_HOST=localhost
REDIS_PORT=6379

STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PROFESSIONAL=price_professional_id
STRIPE_PRICE_ENTERPRISE=price_enterprise_id

SENTRY_DSN=https://...

RESEND_API_KEY=re_...
EMAIL_FROM=noreply@optimairwing.app

VITE_APP_URL=https://optimairwing.app
CORS_ORIGINS=https://optimairwing.app,https://api.optimairwing.app

OTEL_EXPORTER_OTLP_ENDPOINT=  # Opcional: observability vendor
```

## Paso 2: Stripe — Productos y Webhook

1. Crear productos en Stripe Dashboard:
   - **Professional**: 250€/mes, `price_professional_id`
   - **Enterprise**: 500€/mes, `price_enterprise_id`

2. Configurar Webhook en Stripe Dashboard:
   - URL: `https://api.optimairwing.app/api/stripe/webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.updated`, `invoice.paid`
   - Firmar con `STRIPE_WEBHOOK_SECRET`

3. El endpoint `POST /api/stripe/checkout` crea una sesión y redirige a Stripe.
   Cuando el pago se completa, Stripe llama al webhook y el plan se actualiza automáticamente.

## Paso 3: DNS + SSL

```bash
# DNS — añadir registros A:
optimairwing.app  → <IP del load balancer>
api.optimairwing.app → <IP del load balancer>

# cert-manager (instalar en cluster):
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml

# ClusterIssuer para Let's Encrypt (ya referenciado en ingress.yaml):
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@optimairwing.app
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

## Paso 4: Base de Datos

Opción A — Cloud SQL (recomendado):
```bash
cd infra/terraform
terraform init
terraform plan -var="project_id=tu-proyecto-gcp"
terraform apply -var="project_id=tu-proyecto-gcp" -auto-approve
```

Opción B — PostgreSQL auto-gestionado:
```bash
docker compose -f docker-compose.prod.yml up -d postgres redis
```

Las migraciones se ejecutan automáticamente al iniciar la app (ver `server/infra/postgres.ts`).

## Paso 5: Deploy

```bash
# Automático (requiere GHCR + kubectl configurado):
bash scripts/deploy.sh staging    # Preview
bash scripts/deploy.sh production # Producción

# O manual:
docker build -t ghcr.io/optimairwing/api:latest .
docker push ghcr.io/optimairwing/api:latest
kubectl set image deployment/optimairwing-api api=ghcr.io/optimairwing/api:latest -n optimairwing
kubectl rollout status deployment/optimairwing-api -n optimairwing
```

## Paso 6: Verificar

```bash
# Health check completo:
curl https://api.optimairwing.app/api/health

# Métricas Prometheus:
curl https://api.optimairwing.app/metrics

# Swagger docs:
open https://api.optimairwing.app/api-docs
```

## Monitoreo

1. Importar dashboards de Grafana desde `infra/grafana/dashboard.json`
2. Configurar reglas de alerta desde `infra/grafana/alert-rules.yml`
3. Conectar Prometheus al endpoint `/metrics` de la API

## Backup

Los backups se generan automáticamente cada 6 horas (`BACKUP_CRON=0 */6 * * *`).
Se almacenan en `/tmp/optimairwing-backups/` dentro del contenedor.
Para persistencia real, montar un volumen o usar un bucket S3/GCS.

## Rollback

```bash
kubectl rollout undo deployment/optimairwing-api -n optimairwing
kubectl rollout status deployment/optimairwing-api -n optimairwing
```

Para rollback de base de datos, las migraciones Drizzle están versionadas en `server/db/migrations/`.
