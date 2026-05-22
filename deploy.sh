#!/bin/bash

# Exit immediately if any command fails
set -e

echo "🚀 Starting Swiss Fumo Radar Deployment..."

# 1. Fetch latest code from GitHub
git fetch origin main
git reset --hard origin main

# 2. Rebuild and restart the container without downtime
# --build forces Docker to re-read any changes in index.js
# -d keeps it detached in the background
docker compose up -d --build

# 3. Clean up old, unused Docker images to save disk space
docker image prune -f

echo "✅ Deployment successful! Radar is fully operational."