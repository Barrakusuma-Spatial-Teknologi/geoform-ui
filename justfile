set shell := ["sh", "-c"]
set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

# OS-aware gradle command
container_tool := `command -v podman || command -v docker || (echo "Neither podman nor docker found!" >&2; exit 1)`

# Default recipe (does nothing)
default:
    @echo "No recipe selected. Use 'just --list' to list available recipes."

# Build docker image of the services
docker_build:
    @{{container_tool}} rmi geoform-ui || true
    @{{container_tool}} build . -t geoform-ui:latest

# Save the image as tar for copying later
docker_save:
    just docker:build
    @docker save -o geoform-ui.tar geoform-ui:latest

# Load the image from tar
docker_load:
    @docker load -i geoform-ui:latest
