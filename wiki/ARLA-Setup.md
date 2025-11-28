# ARLA API Integration Setup

> **⚠️ IMPORTANT**: ARLA API integration is currently **NOT IMPLEMENTED** due to memory constraints encountered during FAA data import. This documentation is preserved for future reference when a lightweight ARLA fork is developed.
>
> **Current Status**: ForeFlight CSV-only mode is the only available option.
>
> **Planned Solution**: Create a lightweight fork of ARLA that imports only essential aircraft lookup data (tail number, make, model, year) to reduce memory requirements.

---

## Overview (Future Implementation)

~~The ARLA API runs as a separate container in your docker-compose stack, providing aircraft registration lookups from the FAA database without CORS issues or external dependencies.~~

**Note**: The sections below describe the planned implementation. They are not currently functional.

## Architecture

```
┌─────────────────┐
│  flight-budget  │ :8181
│   (nginx)       │
└────────┬────────┘
         │
         ├─ /          → Static app files
         ├─ /data/     → Aircraft persistence
         └─ /arla-api/ → Proxied to arla-api:3000
                         │
                         ▼
                    ┌──────────┐
                    │ arla-api │ :3000
                    │ (Next.js)│
                    └────┬─────┘
                         │
                         └─ Database (Supabase/Prisma)
```

## Prerequisites

The ARLA API requires a database to store FAA registration data. You have two options:

### Option 1: Self-host with Local PostgreSQL (Recommended)
Set up a PostgreSQL database in the docker-compose stack and import FAA data (see Database Setup section below).

### Option 2: Use a Cloud Database (Supabase/Railway/etc.)
Set up a PostgreSQL database in the cloud and import FAA data using the same process.

## Database Setup (For Self-Hosted Option)

If you're self-hosting the database, follow these steps to initialize it with FAA registration data:

### 1. Add PostgreSQL to Docker Compose

Edit `infrastructure/docker-compose.yml` to add a PostgreSQL service:

```yaml
  postgres:
    image: postgres:15-alpine
    container_name: arla-postgres
    restart: unless-stopped

    environment:
      - POSTGRES_DB=arla
      - POSTGRES_USER=arla
      - POSTGRES_PASSWORD=arla123

    volumes:
      - arla-postgres-data:/var/lib/postgresql/data

    expose:
      - "5432"

    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U arla"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  flight-budget-config:
    driver: local
  arla-postgres-data:
    driver: local
```

Update the `arla-api` service to depend on postgres:

```yaml
  arla-api:
    # ... existing config ...
    depends_on:
      - postgres
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://arla:arla123@postgres:5432/arla
```

### 2. Initialize the Database

Start the postgres container:

```bash
cd infrastructure
docker-compose up -d postgres
```

Access the ARLA API container to run migrations and data import:

```bash
# Enter the ARLA container
docker exec -it arla-api sh

# Install dependencies (if not already installed)
yarn install --frozen-lockfile

# Run Prisma migrations to create database schema
yarn prisma migrate deploy

# Import FAA registration data
yarn tsx ./src/lib/update_faa_data.ts

# Exit the container
exit
```

**Note**: The data import may take 15-30 minutes depending on your system and the size of the FAA dataset.

### 3. Verify Database Population

Check if data was imported successfully:

```bash
docker exec -it arla-postgres psql -U arla -d arla -c "SELECT COUNT(*) FROM aircraft;"
```

You should see a count of aircraft records (typically 300,000+).

### 4. Set Up Automated Updates (Optional)

The FAA updates its database weekly. To keep your data current, you can set up a cron job:

```bash
# Add to crontab (runs Tuesdays at 1:00am)
0 1 * * 2 docker exec arla-api yarn tsx ./src/lib/update_faa_data.ts
```

Or create a docker-compose scheduled task using a tool like Ofelia.

## Environment Variables

Create or update `infrastructure/.env`:

```bash
# App Settings
APP_PORT=8181
TIMEZONE=America/New_York

# ARLA API Database Connection
# Choose one of the following options:

# Option 1: Local PostgreSQL (from docker-compose) - RECOMMENDED
ARLA_DATABASE_URL=postgresql://arla:arla123@postgres:5432/arla

# Option 2: Remote/Cloud Database (Supabase, Railway, etc.)
# ARLA_DATABASE_URL=postgresql://user:pass@host:5432/arla
```

**Security Note**: Change the default password (`arla123`) for production deployments.

## Deployment Steps

### 1. Build the ARLA API

Since ARLA doesn't provide a pre-built Docker image, docker-compose will build it from source:

```bash
cd infrastructure
docker-compose build arla-api
```

**Note**: The first build may take 10-15 minutes as it clones the repo and installs dependencies.

### 2. Start the Stack

```bash
docker-compose up -d
```

This will start both containers:
- `flight-budget-app` on port 8181
- `arla-api` on internal network (not exposed externally)

### 3. Verify the Integration

Check if ARLA API is running:

```bash
# Check container logs
docker logs arla-api

# Test the API directly
curl http://localhost:8181/arla-api/api/v0/faa/registration/N12345
```

### 4. Enable FAA Lookup in the App

1. Open the Flight Budget app: `http://localhost:8181`
2. Check the "Enable FAA Aircraft Lookup" checkbox
3. Import your ForeFlight CSV
4. Aircraft should now show "✓ FAA Verified" badges

## Troubleshooting

### ARLA Container Won't Start

**Check logs:**
```bash
docker logs arla-api
```

**Common issues:**
- Missing DATABASE_URL environment variable
- Database connection failed
- Port 3000 already in use

### API Returns 500 Errors

The ARLA API needs FAA registration data in its database. Follow the Database Setup section to:
1. Uncomment the PostgreSQL service in docker-compose.yml
2. Start the postgres container
3. Run the database initialization commands
4. Import FAA data using the update script

### No "FAA Verified" Badges

1. Check browser console for errors
2. Verify nginx is proxying correctly:
   ```bash
   docker exec flight-budget-app cat /etc/nginx/conf.d/default.conf
   ```
3. Test the proxy:
   ```bash
   curl http://localhost:8181/arla-api/api/v0/health
   ```

## Performance & Resources

**ARLA API Container:**
- CPU: 0.25-1.0 cores
- Memory: 128MB-512MB
- Disk: ~500MB (app + dependencies)
- Database: Variable (depends on FAA data size)

**Expected Response Times:**
- Cache hit: <50ms
- Cache miss: <200ms
- First request: ~500ms (cold start)

## Updating ARLA

To update to the latest ARLA version:

```bash
cd infrastructure
docker-compose down arla-api
docker-compose build --no-cache arla-api
docker-compose up -d
```

## Database Size and Requirements

**Disk Space:**
- PostgreSQL data: ~1GB
- ARLA API container: ~500MB
- Total: ~1.5GB

**FAA Dataset:**
- ~300,000+ active aircraft registrations
- ~50,000+ deregistered aircraft (historical)
- Updated weekly by FAA (Tuesdays 11:30am Central)

## Support

- **ARLA Project**: https://github.com/njfdev/Aircraft-Registration-Lookup-API
- **Flight Budget Issues**: https://github.com/ryakel/flight-budget/issues

## Known Issues

**Memory Constraints (Current Blocker)**:
- FAA data import requires ~1GB+ memory
- Node.js heap exhaustion during import of 300K+ aircraft records
- Import consistently fails after importing reference data

## Future Improvements

- [ ] **PRIORITY**: Create lightweight ARLA fork with minimal dataset
  - Import only essential fields (tail number, make, model, year)
  - Reduce database size from ~1GB to ~50-100MB
  - Test memory usage during import
- [ ] Create custom ARLA Docker image with pre-loaded FAA data
- [ ] Add periodic FAA data sync script
- [ ] Implement local caching layer (Redis)
- [ ] Add ARLA health monitoring to Flight Budget UI
