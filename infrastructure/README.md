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

Enable self-hosted FAA aircraft data lookup via [tail-lookup](https://github.com/ryakel/tail-lookup):

```bash
# Enable FAA lookup with tail-lookup service
ENABLE_FAA_LOOKUP=true
```

**tail-lookup Service**:
- Lightweight Python + SQLite service (~256MB memory)
- Automatic daily FAA data updates via nightly builds
- No database setup required - SQLite database baked into Docker image

## Deployment Modes

### Mode 1: Basic (No FAA Lookup)
```bash
ENABLE_FAA_LOOKUP=false
```

**Services**: flight-budget only
**Memory**: ~128MB
**Features**: All features using ForeFlight CSV data only

### Mode 2: With FAA Lookup (tail-lookup)
```bash
ENABLE_FAA_LOOKUP=true
```

**Services**: flight-budget + tail-lookup
**Memory**: ~384MB total (128MB + 256MB)
**Features**: All features + automatic FAA aircraft data verification

**What you get**:
- Automatic aircraft data lookup from FAA registry during CSV import
- "✓ FAA Verified" badges on aircraft with verified data
- Up-to-date FAA database (updated nightly)
- No manual database setup required

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
./deploy.sh logs tail-lookup

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

## Example Configurations

See the [examples/](examples/) directory for ready-to-use deployment configurations:

- **[docker-compose.basic.yml](examples/docker-compose.basic.yml)** - Simple deployment without FAA lookup
- **[docker-compose.with-faa-lookup.yml](examples/docker-compose.with-faa-lookup.yml)** - Full deployment with tail-lookup service
- **[examples/README.md](examples/README.md)** - Comprehensive deployment guide

These examples are production-ready and can be used as-is or customized for your needs.

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
# Verify tail-lookup service is running
docker ps | grep tail-lookup

# Check tail-lookup logs
docker logs tail-lookup-api

# Test API endpoint
curl http://localhost:8181/tail-lookup-api/api/v1/health

# Test aircraft lookup
curl http://localhost:8181/tail-lookup-api/api/v1/aircraft/N172SP
```

**Common issues**:
- Container not started with `--profile faa-lookup` flag
- `ENABLE_FAA_LOOKUP` not set to `true` in environment
- Browser cache showing old JavaScript (hard refresh: Cmd+Shift+R / Ctrl+Shift+R)

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
├── examples/              # Example deployment configurations
│   ├── docker-compose.basic.yml
│   ├── docker-compose.with-faa-lookup.yml
│   └── README.md
└── README.md              # This file
```

## Volumes

- `flight-budget-config` - Aircraft configuration data (persistent)

## Ports

- `8181` (configurable) - Flight Budget web interface
- `3000` (internal) - tail-lookup API (if enabled)

## Resource Limits

| Service | CPU Limit | Memory Limit | Reserved CPU | Reserved Memory |
|---------|-----------|--------------|--------------|-----------------|
| flight-budget | 0.5 | 128MB | 0.1 | 32MB |
| tail-lookup | 1.0 | 256MB | 0.25 | 64MB |

## Security Notes

- Keep .env file secure (never commit to version control)
- Consider using secrets management for production
- Enable SSL/TLS termination at reverse proxy level
- Review SECURITY.md for security policies and reporting procedures

## Documentation

- [Deployment Guide](../wiki/Deployment.md) - Production deployment procedures
- [Container Setup](../wiki/Container-Setup.md) - Docker configuration details
- [Pre-Deployment Checklist](../wiki/Pre-Deployment-Checklist.md) - Setup verification guide

## Support

- **Issues**: https://github.com/ryakel/flight-budget/issues
- **Discussions**: https://github.com/ryakel/flight-budget/discussions
- **Wiki**: https://github.com/ryakel/flight-budget/wiki
