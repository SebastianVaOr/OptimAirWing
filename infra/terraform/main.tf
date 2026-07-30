provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_container_cluster" "optimairwing" {
  name     = "optimairwing-cluster"
  location = var.region

  initial_node_count = 3
  node_config {
    machine_type = "e2-standard-2"
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]
    labels = {
      environment = var.environment
    }
    disk_size_gb = 50
    disk_type    = "pd-standard"
  }
  deletion_protection = false
}

resource "google_sql_database_instance" "postgres" {
  name             = "optimairwing-postgres-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = "db-custom-2-7680"
    disk_size         = 100
    disk_autoresize   = true
    disk_type         = "PD_SSD"
    availability_type = "ZONAL"

    ip_configuration {
      ipv4_enabled    = true
      private_network = google_compute_network.main.id
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
    }
  }
}

resource "google_sql_database" "database" {
  name     = "optimairwing"
  instance = google_sql_database_instance.postgres.name
}

resource "google_redis_instance" "cache" {
  name           = "optimairwing-redis-${var.environment}"
  tier           = "STANDARD_HA"
  memory_size_gb = 2
  region         = var.region
}

resource "google_compute_network" "main" {
  name = "optimairwing-network-${var.environment}"
}
