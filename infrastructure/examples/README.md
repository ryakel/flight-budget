# Docker Compose Examples

This directory contains example docker-compose configurations for different deployment scenarios.

## Available Examples

### 1. Basic Deployment (No FAA Lookup)
**File**: `docker-compose.basic.yml`

Simplest configuration - just the flight-budget app without FAA aircraft lookup.

```bash
docker compose -f docker-compose.basic.yml up -d
```

**Access**: http://localhost:8181

**Features**:
- Manual aircraft entry
- CSV import from ForeFlight
- Local storage persistence

---

### 2. With FAA Lookup
**File**: `docker-compose.with-faa-lookup.yml`

Includes the tail-lookup service for automatic FAA aircraft data population.

```bash
docker compose -f docker-compose.with-faa-lookup.yml up -d
```

**Access**:
- Flight Budget: http://localhost:8181
- Tail-Lookup API (if debugging port enabled): http://localhost:8080

**Features**:
- All basic features
- Automatic aircraft lookup by tail number
- Pre-population of Year, Make, Model from FAA database
- 308,000+ US aircraft records
- Daily automatic database updates

**Note**: The tail-lookup service uses internal networking by default. To enable external access for debugging, edit the compose file and uncomment the `ports` section.

---

## Production Deployment

For production use, copy the appropriate example to your deployment location and customize:

```bash
# Copy example
cp examples/docker-compose.with-faa-lookup.yml docker-compose.yml

# Edit as needed
nano docker-compose.yml

# Deploy
docker compose up -d
```

### Recommended Production Changes:

1. **Change ports** if 8181 conflicts:
   ```yaml
   ports:
     - "YOUR_PORT:80"
   ```

2. **Set timezone**:
   ```yaml
   environment:
     - TZ=America/New_York  # or your timezone
   ```

3. **Use specific image tags** instead of `:latest`:
   ```yaml
   image: ryakel/flight-budget:2025-11-28
   image: ryakel/tail-lookup:2025-11-28
   ```

4. **Configure resource limits** based on your server:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 256M  # Adjust as needed
   ```

---

## Updating

### Pull latest images:
```bash
docker compose pull
docker compose up -d
```

### View logs:
```bash
docker compose logs -f
```

### Stop services:
```bash
docker compose down
```

### Remove data (WARNING: deletes aircraft configuration):
```bash
docker compose down -v
```

---

## Portainer Deployment

Both examples work with Portainer stacks. Simply:

1. Go to Stacks → Add Stack
2. Paste the contents of the desired example file
3. Customize environment variables if needed
4. Deploy

For the FAA lookup version, Portainer will automatically handle the service networking.

---

## Troubleshooting

### FAA Lookup not working?
1. Check tail-lookup service is running: `docker ps`
2. Check logs: `docker logs tail-lookup-api`
3. Verify environment variable: `docker exec flight-budget-app env | grep ENABLE_FAA_LOOKUP`
4. Test API directly: `curl http://localhost:8080/api/v1/health` (if port published)

### Port conflicts?
Change the port mapping in the compose file:
```yaml
ports:
  - "8080:80"  # Use port 8080 instead of 8181
```

### Data not persisting?
Ensure the volume is created:
```bash
docker volume ls | grep flight-budget
```
