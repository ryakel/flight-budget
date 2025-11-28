# Flight Training Budget Calculator

A web-based calculator to help pilots estimate costs for flight training certifications including Instrument Rating, Commercial Pilot License, and CFI.

## Features

- 📊 Import ForeFlight logbook (CSV) to track current hours
- ✈️ Calculate costs for multiple aircraft with wet/dry rates
- 📈 Visual budget breakdown with charts
- 💾 Save and load budget configurations
- 📄 Export budget reports to PDF
- 🎯 Track progress toward certification requirements

## Deployment

This application is containerized and designed to be deployed with Docker and Portainer.

### Prerequisites

- Docker and Docker Compose
- Portainer (optional, for easier management)
- Nginx reverse proxy (for production deployment)

### Quick Start with Docker Compose

1. Clone the repository:
   ```bash
   git clone https://github.com/ryakel/flight-budget.git
   cd flight-budget
   ```

2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

3. Adjust settings in `.env` if needed (default port is 8181)

4. Start the application:
   ```bash
   docker-compose up -d
   ```

5. Access the app at `http://localhost:8181`

### Deploying with Portainer

1. In Portainer, navigate to **Stacks** → **Add Stack**

2. Choose one of these methods:
   - **Git Repository**: Point to `https://github.com/ryakel/flight-budget`
   - **Upload**: Upload the `docker-compose.yml` file
   - **Web Editor**: Paste the contents of `docker-compose.yml`

3. Configure environment variables:
   - `APP_PORT`: Host port (default: 8181)
   - `TIMEZONE`: Container timezone (default: UTC)

4. Deploy the stack

5. Set up the webhook for automatic updates (see below)

### Production Deployment with Nginx Reverse Proxy

Add this configuration to your Nginx server:

```nginx
server {
    listen 80;
    server_name budget.yourdomain.com;

    location / {
        proxy_pass http://localhost:8181;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

For HTTPS, use Let's Encrypt with certbot:
```bash
certbot --nginx -d budget.yourdomain.com
```

## Automated Updates with Portainer Webhooks

### Step 1: Create Portainer Webhook

1. In Portainer, go to your stack
2. Click **Webhooks** → **Add Webhook**
3. Copy the webhook URL (format: `https://your-portainer.com/api/webhooks/xxx`)

### Step 2: Add Webhook to GitHub Secrets

1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:
   - `DOCKER_USERNAME`: Your Docker Hub username (ryakel)
   - `DOCKER_PASSWORD`: Your Docker Hub access token
   - `PORTAINER_WEBHOOK_URL`: Your Portainer webhook URL

### How It Works

1. Push code to `main` branch
2. GitHub Actions builds the Docker image
3. Image is pushed to Docker Hub (`ryakel/flight-budget:latest`)
4. Portainer webhook is triggered automatically
5. Portainer pulls the new image and redeploys

## Architecture

```
┌─────────────────────────────────────────┐
│         GitHub Repository               │
│     (ryakel/flight-budget)              │
└────────────────┬────────────────────────┘
                 │ Push to main
                 ▼
┌─────────────────────────────────────────┐
│       GitHub Actions Workflow           │
│  • Download CDN dependencies (weekly)   │
│  • Build multi-arch Docker image        │
│  • Push to Docker Hub                   │
│  • Trigger Portainer webhook            │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│          Docker Hub Registry            │
│      ryakel/flight-budget:latest        │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│        Portainer (Auto-deploy)          │
│  • Pull latest image                    │
│  • Redeploy stack                       │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Docker Container                │
│    nginx:alpine + Flight Budget App     │
│    Port: 8181 → 80                      │
│    Volume: flight-budget-data           │
└─────────────────────────────────────────┘
```

## Development

### Local Development (No Docker)

Simply open `index.html` in a web browser. All dependencies are included locally in the `libs/` directory.

### Building the Docker Image Locally

```bash
docker build -t ryakel/flight-budget:latest .
```

### Testing Locally

```bash
docker run -d -p 8181:80 --name flight-budget-test ryakel/flight-budget:latest
```

Access at `http://localhost:8181`

## Persistence

Aircraft configurations are stored in a Docker volume (`flight-budget-data`). This includes:
- Default aircraft rates and settings
- Custom aircraft added by users

The volume persists even when the container is recreated, ensuring configurations are not lost during updates.

## Updating Dependencies

JavaScript libraries (PapaParse, Chart.js, html2pdf.js) are vendored locally and updated automatically:

- **Automatic**: GitHub Actions workflow runs weekly on Sunday at 2 AM UTC
- **Manual**: Go to **Actions** → **Update CDN Dependencies** → **Run workflow**

When updates are found, a Pull Request is automatically created for review.

## Configuration

### Environment Variables

| Variable   | Default | Description                    |
|------------|---------|--------------------------------|
| `APP_PORT` | 8181    | Host port mapping              |
| `TIMEZONE` | UTC     | Container timezone for logs    |

### Resource Limits

The container is configured with the following limits:
- CPU: 0.5 cores (max), 0.1 cores (reserved)
- Memory: 128MB (max), 32MB (reserved)

Adjust these in `docker-compose.yml` if needed.

## Troubleshooting

### Container Health Check Failing

Check the container logs:
```bash
docker logs flight-budget-app
```

Verify the health endpoint:
```bash
curl http://localhost:8181/health
```

Expected response: `healthy`

### Unable to Access Application

1. Check if the container is running:
   ```bash
   docker ps | grep flight-budget
   ```

2. Verify port binding:
   ```bash
   docker port flight-budget-app
   ```

3. Check nginx logs:
   ```bash
   docker exec flight-budget-app cat /var/log/nginx/error.log
   ```

### Persistence Issues

Verify the volume exists:
```bash
docker volume ls | grep flight-budget
```

Inspect volume:
```bash
docker volume inspect flight-budget_flight-budget-data
```

## Security

- Container runs as non-root user (`nginx`)
- Security headers configured (X-Frame-Options, CSP, etc.)
- Gzip compression enabled
- No sensitive data stored in container
- Health check endpoint at `/health`

## License

[Add your license here]

## Contributing

[Add contributing guidelines here]

## Support

For issues and questions, please use the GitHub Issues tracker.
