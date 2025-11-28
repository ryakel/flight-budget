#!/bin/bash
# Flight Budget Deployment Script
# Automatically enables correct Docker Compose profiles based on .env settings

set -e

cd "$(dirname "$0")"

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Build profiles list based on enabled features
PROFILES=""

if [ "$ENABLE_FAA_LOOKUP" = "true" ]; then
    echo ""
    echo "⚠️  WARNING: FAA Lookup is NOT YET IMPLEMENTED"
    echo "⚠️  ARLA API deployment will fail due to memory constraints"
    echo ""
    echo "The FAA data import requires more memory than currently available."
    echo "A lightweight fork of ARLA is planned for future implementation."
    echo ""
    echo "For now, please use ForeFlight CSV-only mode by setting:"
    echo "  ENABLE_FAA_LOOKUP=false"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi

    echo "⚠️  Proceeding with ARLA deployment (not recommended)..."
    PROFILES="$PROFILES --profile faa-lookup"

    if [ "$ENABLE_POSTGRES" = "true" ]; then
        echo "⚠️  PostgreSQL enabled - will deploy database"
        PROFILES="$PROFILES --profile postgres"
    else
        echo "ℹ Using external database"
    fi
else
    echo "ℹ FAA Lookup disabled - running in ForeFlight CSV-only mode"
fi

# Build the command
CMD="docker compose$PROFILES"

# Execute the requested action
case "${1:-up}" in
    up)
        echo ""
        echo "Starting services..."
        $CMD up -d
        echo ""
        echo "✓ Services started!"
        echo ""
        docker compose ps
        ;;
    down)
        echo "Stopping services..."
        docker compose down
        ;;
    restart)
        echo "Restarting services..."
        docker compose down
        $CMD up -d
        echo ""
        docker compose ps
        ;;
    logs)
        docker compose logs -f "${2:-}"
        ;;
    ps)
        docker compose ps
        ;;
    *)
        echo "Usage: $0 {up|down|restart|logs|ps}"
        echo ""
        echo "Examples:"
        echo "  $0 up       - Start services"
        echo "  $0 down     - Stop services"
        echo "  $0 restart  - Restart services"
        echo "  $0 logs     - View logs (all services)"
        echo "  $0 logs flight-budget - View logs (specific service)"
        echo "  $0 ps       - Show service status"
        exit 1
        ;;
esac
