#!/bin/bash
# Chaos Testing — mata instancias aleatoriamente y verifica recuperación
set -e

NAMESPACE="${1:-aeroforge}"
DURATION="${2:-60}"  # segundos

echo "=== Chaos Test: AeroForge ==="
echo "Namespace: $NAMESPACE"
echo "Duration: ${DURATION}s"
echo ""

# Verificar health antes
echo "→ Health check antes:"
curl -sf http://localhost:3000/api/health | head -1

END=$((SECONDS + DURATION))
COUNT=0

while [ $SECONDS -lt $END ]; do
  POD=$(kubectl -n "$NAMESPACE" get pods -l app=aeroforge-api -o name | shuf -n1)
  echo ""
  echo "✖ Matando $POD..."
  kubectl -n "$NAMESPACE" delete "$POD" --grace-period=1 --wait=false
  COUNT=$((COUNT + 1))
  sleep $((RANDOM % 5 + 3))

  # Verificar que sigue respondiendo
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
  echo "  Health code: $HTTP_CODE"
  if [ "$HTTP_CODE" -eq 503 ]; then
    echo "  ⚠ Degradado pero respondiendo"
  fi
done

echo ""
echo "=== Chaos Test Completo ==="
echo "Pods eliminados: $COUNT"
echo "Health final:"
curl -s http://localhost:3000/api/health
