# Initial adoption requires this existing instance to import successfully.
# Once it is in state the block is a no-op; always review subsequent plans,
# especially after state loss or deletion outside Terraform.
import {
  to = module.gcp.google_compute_instance.bot
  id = "projects/${var.project_id}/zones/us-east1-b/instances/${var.instance_name}"
}
