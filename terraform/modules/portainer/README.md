# Portainer / Docker (inactive alternative)

The root `terraform/` configuration calls only `modules/gcp`. This directory
preserves the former Docker-image build/push and SSH container deployment.
It does not run unless a caller explicitly adds a module block and supplies
Docker provider configuration and all required inputs.

The Docker provider belongs to the calling root, not this module. Configure
its Docker host and registry authentication there; do not put credentials in
tracked Terraform files. Set `image_repository` explicitly and store the SSH
private key outside the repository. `botrucho.example` is not a real key.

This module deploys directly to a Docker host over SSH; it is the legacy
Portainer/Docker path, not a GCP VM provisioner or a Portainer API installer.
The optional manually triggered GitHub workflow can still notify an existing
Portainer installation using its webhook secret.

`shards` defaults to `1` and accepts positive integers only. It is passed as a
container environment override so legacy encrypted `SHARDS=auto` cannot prevent
startup. Increasing it also requires reviewing the whole-container memory budget.

If the former root has deployed resources in an existing Terraform state,
back up and plan a deliberate state migration to module addresses before
using this module. Do not apply the new GCP root over old Docker state:
removing root resource declarations can otherwise propose destroying them.
No state migration or apply was performed as part of this reorganization.
