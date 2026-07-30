#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-staging}"
NAMESPACE="aeroforge"
IMAGE_TAG="ghcr.io/aeroforge/api:$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')"

echo "=== Deploy AeroForge [$ENV] ==="

# 1. Build y push
echo "→ Building image: $IMAGE_TAG"
docker build -t "$IMAGE_TAG" .
docker push "$IMAGE_TAG"

# 2. Configurar contexto kubectl
echo "→ Configurando kubectl para $ENV"
if [ "$ENV" = "production" ]; then
  gcloud container clusters get-credentials aeroforge-cluster --region us-central1
  kubectl config set-context --current --namespace="$NAMESPACE"
else
  kubectl config use-context minikube
  kubectl create namespace "$NAMESPACE" 2>/dev/null || true
fi

# 3. Aplicar manifiestos K8s
echo "→ Aplicando manifiestos..."
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/configmap.yaml 2>/dev/null || true
kubectl apply -f infra/k8s/secrets.yaml

# Actualizar imagen del deployment
kubectl set image deployment/aeroforge-api api="$IMAGE_TAG" -n "$NAMESPACE"
kubectl set image deployment/aeroforge-worker worker="$IMAGE_TAG" -n "$NAMESPACE"

kubectl apply -f infra/k8s/service.yaml
kubectl apply -f infra/k8s/ingress.yaml
kubectl apply -f infra/k8s/hpa.yaml

# 4. Esperar rollout
echo "→ Esperando rollout..."
kubectl rollout status deployment/aeroforge-api -n "$NAMESPACE" --timeout=180s
kubectl rollout status deployment/aeroforge-worker -n "$NAMESPACE" --timeout=180s

# 5. Health check
echo "→ Health check..."
sleep 5
curl -sf "https://api.aeroforge.app/api/health" || echo "⚠ Health check falló — revisar logs"

echo "=== Deploy completado [$ENV] ==="
