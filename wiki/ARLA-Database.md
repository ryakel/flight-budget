# ARLA Database Quick Start

> **⚠️ IMPORTANT**: ARLA database integration is currently **NOT IMPLEMENTED** due to memory constraints during FAA data import. This documentation is preserved for future reference.
>
> **Current Status**: ForeFlight CSV-only mode is the only available option.
>
> **See**: [ARLA-Setup.md](ARLA-Setup.md) for details on the memory issues and planned solutions.

---

This is a quick reference for setting up the ARLA database. For complete setup instructions, see [ARLA-Setup.md](ARLA-Setup.md).

**Note**: The instructions below are not currently functional.

## Quick Setup (Self-Hosted PostgreSQL)

### 1. Enable PostgreSQL in docker-compose.yml

Uncomment the `postgres` service and volume:

```yaml
  postgres:
    image: postgres:15-alpine
    container_name: arla-postgres
    restart: unless-stopped
    # ... (uncomment full service definition)

  arla-api:
    # ...
    depends_on:
      - postgres  # Uncomment this

volumes:
  arla-postgres-data:  # Uncomment this
    driver: local
```

### 2. Configure Environment

Create `infrastructure/.env` from `.env.example`:

```bash
cp .env.example .env
```

Ensure this line is uncommented:
```bash
ARLA_DATABASE_URL=postgresql://arla:arla123@postgres:5432/arla
```

### 3. Start Services

```bash
cd infrastructure
docker-compose up -d
```

### 4. Initialize Database

Wait for containers to be healthy, then:

```bash
# Enter the ARLA container
docker exec -it arla-api sh

# Run database setup
yarn install --frozen-lockfile
yarn prisma migrate deploy
yarn tsx ./src/lib/update_faa_data.ts

# Exit
exit
```

**Note**: Data import takes 15-30 minutes.

### 5. Verify

Check if data was imported:

```bash
docker exec -it arla-postgres psql -U arla -d arla -c "SELECT COUNT(*) FROM aircraft;"
```

Expected result: 300,000+ aircraft records.

### 6. Test the API

```bash
# Test health endpoint
curl http://localhost:8181/arla-api/api/v0/health

# Test aircraft lookup
curl http://localhost:8181/arla-api/api/v0/faa/registration/N12345
```

## Alternative: Use Cloud Database (Supabase/Railway)

1. Create PostgreSQL database on cloud platform
2. Update `.env` with connection string:
   ```bash
   ARLA_DATABASE_URL=postgresql://user:pass@host:5432/database
   ```
3. Run initialization steps:
   - Connect to cloud database
   - Run `yarn prisma migrate deploy`
   - Run `yarn tsx ./src/lib/update_faa_data.ts`
   - Verify data with `SELECT COUNT(*) FROM aircraft;`

## Automated Updates (Optional)

Keep FAA data current with weekly updates:

```bash
# Add to crontab (runs Tuesdays at 1:00am)
0 1 * * 2 docker exec arla-api yarn tsx ./src/lib/update_faa_data.ts
```

## Troubleshooting

### Container won't start
```bash
docker logs arla-api
docker logs arla-postgres
```

Common issues:
- Missing DATABASE_URL environment variable
- PostgreSQL not ready (wait 30 seconds after first start)
- Port conflicts

### Database connection failed
```bash
# Check if postgres is running
docker ps | grep postgres

# Test connection
docker exec -it arla-postgres psql -U arla -d arla -c "\dt"
```

### Import script fails
- Check available disk space (needs ~2GB)
- Check internet connectivity (downloads from FAA)
- Review logs: `docker logs arla-api`

## FAA Data Sources

The import script fetches data from:
- FAA Aircraft Registry (ReleasableAircraft.zip)
- FAA Engine Registry
- FAA Dealer/Owner data

Data updates weekly on Tuesdays at 11:30am Central Time.

## Performance

**Expected import times:**
- Initial setup: 15-30 minutes
- Weekly updates: 10-15 minutes

**Database size:**
- ~300,000 aircraft records
- ~500MB-1GB disk space

**API response times:**
- Database query: 50-200ms
- With app caching: <50ms

## Security

**Production checklist:**
- [ ] Change default PostgreSQL password
- [ ] Restrict database network access
- [ ] Use environment-specific credentials
- [ ] Enable SSL for database connections
- [ ] Regular backups of `arla-postgres-data` volume

## Support

- **ARLA Project**: https://github.com/njfdev/Aircraft-Registration-Lookup-API
- **FAA Registry**: https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/releasable_aircraft_download
- **Flight Budget Issues**: https://github.com/ryakel/flight-budget/issues
