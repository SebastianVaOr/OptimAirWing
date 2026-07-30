import prometheus from 'prom-client';

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de requests HTTP en segundos',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
});

const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total de requests HTTP',
  labelNames: ['method', 'route', 'status'],
});

const predictionsTotal = new prometheus.Counter({
  name: 'optimairwing_predictions_total',
  help: 'Total de predicciones ejecutadas',
  labelNames: ['fidelity'],
});

const optimizationsTotal = new prometheus.Counter({
  name: 'optimairwing_optimizations_total',
  help: 'Total de optimizaciones ejecutadas',
  labelNames: ['level', 'mode'],
});

const activeUsers = new prometheus.Gauge({
  name: 'optimairwing_active_users',
  help: 'Usuarios activos en los últimos 15 min',
});

const dbQueryDuration = new prometheus.Histogram({
  name: 'optimairwing_db_query_duration_seconds',
  help: 'Duración de queries a base de datos',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
});

export function trackRequest(method: string, route: string, status: number, durationMs: number) {
  httpRequestsTotal.labels(method, route, String(status)).inc();
  httpRequestDuration.labels(method, route, String(status)).observe(durationMs / 1000);
}

export function trackPrediction(fidelity: string) {
  predictionsTotal.labels(fidelity).inc();
}

export function trackOptimization(level: string, mode: string) {
  optimizationsTotal.labels(level, mode).inc();
}

export function setActiveUsers(count: number) {
  activeUsers.set(count);
}

export function trackDbQuery(durationMs: number) {
  dbQueryDuration.observe(durationMs / 1000);
}

export async function getMetrics(): Promise<string> {
  return prometheus.register.metrics();
}

export { prometheus };
