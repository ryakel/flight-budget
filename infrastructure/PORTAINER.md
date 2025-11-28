# Portainer Deployment Guide

> **⚠️ IMPORTANT**: FAA aircraft lookup via ARLA API is currently **NOT IMPLEMENTED** due to memory constraints during data import. Only Mode 1 (Basic - No FAA Lookup) is functional.
>
> **Current Status**: This guide documents both working and planned features. Modes 2 and 3 are not yet functional.

This guide explains how to deploy Flight Budget Calculator using Portainer with conditional FAA lookup support (planned feature).

## Overview

Portainer supports Docker Compose profiles natively. Currently, only basic deployment (ForeFlight CSV-only mode) is supported. FAA lookup will be added in a future release after a lightweight ARLA fork is developed.

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

#### Basic Configuration (Required) - **CURRENTLY AVAILABLE**

```
APP_PORT=8181
TIMEZONE=America/New_York
ENABLE_FAA_LOOKUP=false
```

#### For FAA Lookup with Self-Hosted Database - **NOT YET IMPLEMENTED**

⚠️ **Do not use** - ARLA integration not functional

```
# NOT FUNCTIONAL - Future implementation only
APP_PORT=8181
TIMEZONE=America/New_York
ENABLE_FAA_LOOKUP=true
ENABLE_POSTGRES=true
ARLA_DATABASE_URL=postgresql://arla:arla123@postgres:5432/arla
POSTGRES_PASSWORD=your_secure_password_here
```

#### For FAA Lookup with External Database - **NOT YET IMPLEMENTED**

⚠️ **Do not use** - ARLA integration not functional

```
# NOT FUNCTIONAL - Future implementation only
APP_PORT=8181
TIMEZONE=America/New_York
ENABLE_FAA_LOOKUP=true
ENABLE_POSTGRES=false
ARLA_DATABASE_URL=postgresql://user:pass@your-db-host:5432/database
```

### 4. Enable Profiles

**IMPORTANT**: In the **Advanced settings** section:

- If `ENABLE_FAA_LOOKUP=true`:
  - Add profile: `faa-lookup`

- If `ENABLE_POSTGRES=true`:
  - Add profiles: `faa-lookup,postgres`

**Portainer Profile Configuration:**
```
Profiles: faa-lookup,postgres
```

Or use the Portainer environment variable approach:
```
COMPOSE_PROFILES=faa-lookup,postgres
```

### 5. Deploy

Click **Deploy the stack**

## Post-Deployment Tasks

### If Using Self-Hosted PostgreSQL

After the stack is deployed and healthy, initialize the FAA database:

1. Go to **Containers** > **arla-api** > **Console**
2. Connect using: `/bin/sh`
3. Run these commands:

```sh
yarn install --frozen-lockfile
yarn prisma migrate deploy
yarn tsx ./src/lib/update_faa_data.ts
```

**Note**: The data import takes 15-30 minutes.

4. Verify the data:

Go to **Containers** > **arla-postgres** > **Console**, connect with `/bin/sh`:

```sh
psql -U arla -d arla -c "SELECT COUNT(*) FROM aircraft;"
```

Expected result: 300,000+ records

## Deployment Modes

> **⚠️ CURRENT STATUS**: Only Mode 1 is functional. Modes 2 and 3 are planned for future implementation.

### Mode 1: Basic (No FAA Lookup) - **CURRENTLY AVAILABLE**

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

### Mode 2: FAA Lookup + Self-Hosted Database - **NOT YET IMPLEMENTED**

**Environment Variables:**
```
# NOT FUNCTIONAL - Future implementation only
APP_PORT=8181
TIMEZONE=America/New_York
ENABLE_FAA_LOOKUP=true
ENABLE_POSTGRES=true
ARLA_DATABASE_URL=postgresql://arla:arla123@postgres:5432/arla
POSTGRES_PASSWORD=your_secure_password
```

**Profiles:** `faa-lookup,postgres`

**Services Deployed:**
- flight-budget
- arla-api (not functional)
- postgres (not functional)

**Resources:** ~896MB RAM

**Status:** ⚠️ Not functional - awaiting lightweight ARLA fork

### Mode 3: FAA Lookup + External Database - **NOT YET IMPLEMENTED**

**Environment Variables:**
```
# NOT FUNCTIONAL - Future implementation only
APP_PORT=8181
TIMEZONE=America/New_York
ENABLE_FAA_LOOKUP=true
ENABLE_POSTGRES=false
ARLA_DATABASE_URL=postgresql://user:pass@host:5432/db
```

**Profiles:** `faa-lookup`

**Services Deployed:**
- flight-budget
- arla-api (not functional)

**Resources:** ~640MB RAM

**Status:** ⚠️ Not functional - awaiting lightweight ARLA fork

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

**Verify ARLA API is running:**
1. Check **Containers** - `arla-api` should be green
2. View logs: **Containers** > **arla-api** > **Logs**
3. Check database connection in logs

**Test the API:**
1. Go to **Containers** > **flight-budget-app** > **Exec console**
2. Run: `wget -qO- http://arla-api:3000/api/v0/health`

### Database Errors

**Check PostgreSQL is running:**
1. **Containers** > **arla-postgres** should be green
2. View logs for connection errors
3. Verify environment variables are correct

**Reset database (destructive):**
1. Stop stack
2. **Volumes** > Delete `infrastructure_arla-postgres-data`
3. Start stack
4. Re-initialize database

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

### Backup PostgreSQL Database

```bash
docker exec arla-postgres pg_dump -U arla arla > faa-backup.sql
```

### Restore PostgreSQL Database

```bash
cat faa-backup.sql | docker exec -i arla-postgres psql -U arla -d arla
```

## Security Best Practices

- ✅ Change default PostgreSQL password
- ✅ Use Portainer secrets for sensitive values
- ✅ Enable HTTPS via reverse proxy (Traefik, nginx)
- ✅ Restrict network access to internal networks
- ✅ Regular backups of volumes
- ✅ Keep containers updated

## Resource Requirements

Plan your host resources based on deployment mode:

| Mode | Containers | RAM | CPU | Disk |
|------|------------|-----|-----|------|
| Basic | 1 | 128MB | 0.1 | 100MB |
| FAA + External DB | 2 | 640MB | 0.35 | 600MB |
| FAA + PostgreSQL | 3 | 896MB | 0.6 | 1.6GB |

## Support

- **Stack Issues**: Check container logs in Portainer
- **Portainer Help**: https://docs.portainer.io/
- **Application Issues**: https://github.com/ryakel/flight-budget/issues

## See Also

- [Infrastructure README](README.md) - Complete infrastructure documentation
- [ARLA Setup Guide](../wiki/ARLA-Setup.md) - Detailed FAA lookup configuration
- [Deployment Wiki](../wiki/Deployment.md) - Production deployment procedures
