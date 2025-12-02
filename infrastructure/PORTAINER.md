# Portainer Deployment Guide

This guide explains how to deploy Flight Budget Calculator using Portainer with optional FAA aircraft lookup support via the tail-lookup service.

## Overview

Portainer supports Docker Compose profiles natively. The Flight Budget Calculator can be deployed in two modes:

1. **Basic Mode**: Flight Budget app only (ForeFlight CSV import)
2. **With FAA Lookup**: Flight Budget app + tail-lookup service for FAA aircraft data verification

The tail-lookup service is a lightweight Python + SQLite solution (~256MB memory) that provides automatic FAA aircraft data lookup without the complexity of a database setup.

## Deployment Steps

### 1. Create Stack in Portainer

1. Navigate to **Stacks** > **Add stack**
2. Name: `flight-budget`
3. Build method: **Git Repository** (recommended) or **Upload**

### 2. Configure Git Repository (Recommended)

If using Git repository:

```
Repository URL: https://github.com/ryakel/flight-budget
Repository reference: refs/heads/main
Compose path: infrastructure/docker-compose.yml
```

**Enable automatic updates** if desired.

### 3. Configure Environment Variables

In the **Environment variables** section, add:

#### Basic Configuration (No FAA Lookup)

```
APP_PORT=8181
TIMEZONE=America/New_York
ENABLE_FAA_LOOKUP=false
```

#### With FAA Lookup (tail-lookup service)

```
APP_PORT=8181
TIMEZONE=America/New_York
ENABLE_FAA_LOOKUP=true
```

**Note**: The tail-lookup service uses a pre-built SQLite database in the Docker image. No database setup or configuration is required.

### 4. Enable Profiles

**IMPORTANT**: In the **Advanced settings** section:

- If `ENABLE_FAA_LOOKUP=true`:
  - Add profile: `faa-lookup`

**Portainer Profile Configuration:**
```
Profiles: faa-lookup
```

Or use the Portainer environment variable approach:
```
COMPOSE_PROFILES=faa-lookup
```

### 5. Deploy

Click **Deploy the stack**

## Post-Deployment Verification

After the stack is deployed, verify services are healthy:

1. **Check Container Status**: All containers should show green/healthy status
2. **View Logs**: **Containers** > Select container > **Logs** to verify startup
3. **Test Application**: Navigate to `http://your-server:8181`

If using FAA lookup:
1. Check tail-lookup health: Visit `http://your-server:8080/api/v1/health`
2. Expected response: `{"status":"healthy","database_exists":true,"record_count":~300000}`

## Deployment Modes

### Mode 1: Basic (No FAA Lookup)

**Environment Variables:**
```
APP_PORT=8181
TIMEZONE=America/New_York
ENABLE_FAA_LOOKUP=false
```

**Profiles:** (none)

**Services Deployed:**
- flight-budget

**Resources:** ~128MB RAM

**Status:** ✅ Fully functional - uses ForeFlight CSV data only

### Mode 2: With FAA Lookup (tail-lookup service)

**Environment Variables:**
```
APP_PORT=8181
TIMEZONE=America/New_York
ENABLE_FAA_LOOKUP=true
```

**Profiles:** `faa-lookup`

**Services Deployed:**
- flight-budget (~128MB RAM)
- tail-lookup (~256MB RAM)

**Total Resources:** ~384MB RAM

**Status:** ✅ Fully functional - automatic FAA aircraft data verification

**Features:**
- Automatic tail number lookup during CSV import
- FAA data verification for US aircraft
- Daily automatic FAA database updates
- No database setup required

## Updating the Stack

### To Enable FAA Lookup

1. Go to your stack > **Editor**
2. Update environment variables:
   - Set `ENABLE_FAA_LOOKUP=true`
   - Add database configuration
3. Update profiles: `faa-lookup,postgres`
4. Click **Update the stack**
5. Initialize the database (see Post-Deployment Tasks)

### To Disable FAA Lookup

1. Go to your stack > **Editor**
2. Update environment variables:
   - Set `ENABLE_FAA_LOOKUP=false`
3. Remove all profiles
4. Click **Update the stack**

## Webhooks for Auto-Deployment

Enable automatic deployments from GitHub:

1. Go to your stack > **Webhooks**
2. Create webhook
3. Copy the webhook URL
4. In GitHub:
   - Go to **Settings** > **Webhooks** > **Add webhook**
   - Paste the URL
   - Content type: `application/json`
   - Events: **Just the push event**
5. Push to your repository triggers automatic redeployment

## Monitoring

### Container Health

View in Portainer:
- **Stacks** > **flight-budget** > Shows health of all services
- Green = Healthy
- Yellow = Starting
- Red = Unhealthy

### Logs

View logs for each service:
1. Go to **Containers**
2. Click on container name
3. **Logs** tab

### Resource Usage

View in **Containers** list:
- CPU usage
- Memory usage
- Network I/O

## Troubleshooting

### Services Not Starting

**Check profiles are enabled:**
1. Go to stack > **Editor**
2. Verify profiles match your ENABLE_* variables
3. Update and redeploy if needed

### FAA Lookup Not Working

**Verify tail-lookup API is running:**
1. Check **Containers** - `tail-lookup-api` should be green
2. View logs: **Containers** > **tail-lookup-api** > **Logs**
3. Look for "Application startup complete" message

**Test the API:**
1. Go to **Containers** > **flight-budget-app** > **Exec console**
2. Run: `wget -qO- http://tail-lookup:8080/api/v1/health`
3. Expected: `{"status":"healthy","database_exists":true,"record_count":~300000}`

**Common Issues:**
- Ensure `ENABLE_FAA_LOOKUP=true` is set
- Verify `faa-lookup` profile is enabled in Portainer
- Check network connectivity between containers

## Backup and Restore

### Backup Aircraft Configuration

```bash
docker cp flight-budget-app:/usr/share/nginx/html/data/aircraft-config.json ./backup.json
```

Or use Portainer:
1. **Containers** > **flight-budget-app** > **Volumes**
2. Browse volume `flight-budget-config`
3. Download `aircraft-config.json`

### Restore Aircraft Configuration

```bash
docker cp ./backup.json flight-budget-app:/usr/share/nginx/html/data/aircraft-config.json
```

Or use Portainer:
1. **Containers** > **flight-budget-app** > **Volumes**
2. Browse volume `flight-budget-config`
3. Upload `aircraft-config.json`

### Notes on tail-lookup Database

The tail-lookup service includes a pre-built SQLite database baked into the Docker image. No backup is needed as:
- Database is automatically rebuilt daily via nightly builds
- Simply pull the latest image to get fresh FAA data
- No manual database management required

## Security Best Practices

- ✅ Enable HTTPS via reverse proxy (Traefik, nginx)
- ✅ Restrict network access to internal networks
- ✅ Regular backups of aircraft configuration data
- ✅ Keep containers updated (use Portainer auto-update or webhooks)
- ✅ Monitor container logs for errors
- ✅ Use strong passwords for Portainer admin access

## Resource Requirements

Plan your host resources based on deployment mode:

| Mode | Containers | RAM | CPU | Disk |
|------|------------|-----|-----|------|
| Basic | 1 | 128MB | 0.1 | 100MB |
| With FAA Lookup | 2 | 384MB | 0.6 | 400MB |

## Support

- **Stack Issues**: Check container logs in Portainer
- **Portainer Help**: https://docs.portainer.io/
- **Application Issues**: https://github.com/ryakel/flight-budget/issues

## See Also

- [Infrastructure README](README.md) - Complete infrastructure documentation
- [Deployment Wiki](../wiki/Deployment.md) - Production deployment procedures
- [tail-lookup Repository](https://github.com/ryakel/tail-lookup) - FAA lookup service documentation
