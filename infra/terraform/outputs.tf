output "cluster_endpoint" {
  value = google_container_cluster.optimairwing.endpoint
}

output "postgres_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "redis_host" {
  value = google_redis_instance.cache.host
}
