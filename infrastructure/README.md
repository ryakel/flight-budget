# Flight Budget Infrastructure

Docker-based deployment configuration for the Flight Budget Calculator.

## Quick Start

```bash
# 1. Create environment configuration
cp .env.example .env

# 2. Start services
./deploy.sh up

# 3. Access the app
open http://localhost:8181
```

## Configuration

Edit `.env` to configure your deployment:

### Basic Settings

```bash
# App port (default: 8181)
APP_PORT=8181

# Timezone
TIMEZONE=America/New_York
```

### FAA Aircraft Lookup (Optional)

> **⚠️ NOTE**: FAA aircraft lookup via ARLA API is currently **NOT IMPLEMENTED** due to memory constraints during data import. This feature is planned for future development with a lightweight fork of the ARLA project. For now, use ForeFlight CSV data only.

~~Enable self-hosted FAA aircraft data lookup:~~

```bash
# Currently disabled - not yet implemented
ENABLE_FAA_LOOKUP=false

# Future implementation (not currently functional):
# ENABLE_FAA_LOOKUP=true
# ENABLE_POSTGRES=true
# ARLA_DATABASE_URL=postgresql://arla:arla123@postgres:5432/arla
# POSTGRES_PASSWORD=change_this_password
```

## Deployment Modes

> **⚠️ CURRENT STATUS**: Only Mode 1 is currently available. Modes 2 and 3 are planned for future implementation.

### Mode 1: Basic (No FAA Lookup) - **CURRENTLY AVAILABLE**
```bash
ENABLE_FAA_LOOKUP=false
```

**Services**: flight-budget only
**Memory**: ~128MB
**Features**: All features using ForeFlight CSV data only

### Mode 2: FAA Lookup with Self-Hosted Database - **NOT YET IMPLEMENTED**
```bash
# Not currently functional
ENABLE_FAA_LOOKUP=true
ENABLE_POSTGRES=true
```

**Status**: Planned for future release with lightweight ARLA fork
**Reason**: Memory constraints during FAA data import (300K+ records)

### Mode 3: FAA Lookup with External Database - **NOT YET IMPLEMENTED**
```bash
# Not currently functional
ENABLE_FAA_LOOKUP=true
ENABLE_POSTGRES=false
ARLA_DATABASE_URL=postgresql://...
```

**Status**: Planned for future release with lightweight ARLA fork
**Reason**: Memory constraints during FAA data import (300K+ records)

## Deployment Script

The `deploy.sh` script automatically enables the correct Docker Compose profiles based on your `.env` settings.

### Usage

```bash
# Start services
./deploy.sh up

# Stop services
./deploy.sh down

# Restart services
./deploy.sh restart

# View logs (all services)
./deploy.sh logs

# View logs (specific service)
./deploy.sh logs flight-budget
./deploy.sh logs arla-api
./deploy.sh logs postgres

# Check service status
./deploy.sh ps
```

## Multi-Architecture Build

Build for multiple platforms (required for deployment):

```bash
# Create builder (first time only)
docker buildx create --name multiarch --use

# Build and push for all platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ryakel/flight-budget:latest \
  -f infrastructure/Dockerfile \
  --push \
  .
```

Supported platforms:
- `linux/amd64` - 64-bit Intel/AMD (most servers)
- `linux/arm64` - 64-bit ARM (Apple Silicon, newer ARM servers)

## Database Initialization

> **⚠️ NOT CURRENTLY IMPLEMENTED**: The ARLA API and database integration is not yet functional. This section is for future reference only.

~~If using self-hosted PostgreSQL, initialize the FAA database:~~

```bash
# NOT FUNCTIONAL - Future implementation only
# ./deploy.sh up
# sleep 30
# docker exec -it arla-api sh
# yarn install --frozen-lockfile
# yarn prisma migrate deploy
# yarn tsx ./src/lib/update_faa_data.ts
```

**Status**: Awaiting lightweight ARLA fork to address memory constraints

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs flight-budget-app

# Common issues:
# - Port 8181 already in use (change APP_PORT in .env)
# - Invalid environment variables
```

### FAA Lookup Not Working

```bash
# Verify ARLA API is running
docker ps | grep arla-api

# Check ARLA logs
docker logs arla-api

# Test API endpoint
curl http://localhost:8181/arla-api/api/v0/health
```

### Database Connection Errors

```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check postgres logs
docker logs arla-postgres

# Test connection
docker exec -it arla-postgres psql -U arla -d arla -c "\dt"
```

## File Structure

```
infrastructure/
├── docker-compose.yml      # Service definitions
├── Dockerfile              # Flight Budget image
├── .env                    # Configuration (do not commit)
├── .env.example            # Configuration template
├── deploy.sh               # Deployment script
├── nginx/
│   ├── nginx.conf         # Nginx configuration
│   └── docker-entrypoint.sh  # Startup script
└── README.md              # This file
```

## Volumes

- `flight-budget-config` - Aircraft configuration data (persistent)
- `arla-postgres-data` - PostgreSQL database (persistent, only if ENABLE_POSTGRES=true)

## Ports

- `8181` (configurable) - Flight Budget web interface
- `3000` (internal) - ARLA API (if enabled)
- `5432` (internal) - PostgreSQL (if enabled)

## Resource Limits

| Service | CPU Limit | Memory Limit | Reserved CPU | Reserved Memory |
|---------|-----------|--------------|--------------|-----------------|
| flight-budget | 0.5 | 128MB | 0.1 | 32MB |
| arla-api | 1.0 | 512MB | 0.25 | 128MB |
| postgres | 0.5 | 256MB | 0.1 | 64MB |

## Security Notes

- Change default passwords in production
- Use strong passwords for PostgreSQL
- Keep .env file secure (never commit to version control)
- Consider using secrets management for production
- Enable SSL/TLS termination at reverse proxy level

## Documentation

- [ARLA Setup Guide](../wiki/ARLA-Setup.md) - Detailed FAA lookup configuration
- [ARLA Database Guide](../wiki/ARLA-Database.md) - Quick reference for database setup
- [Deployment Guide](../wiki/Deployment.md) - Production deployment procedures

## Support

- **Issues**: https://github.com/ryakel/flight-budget/issues
- **Discussions**: https://github.com/ryakel/flight-budget/discussions
- **Wiki**: https://github.com/ryakel/flight-budget/wiki
