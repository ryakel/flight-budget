# Flight Training Budget Calculator

A web-based calculator to help pilots estimate costs for flight training certifications including Instrument Rating, Commercial Pilot License, and CFI.

[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://hub.docker.com/r/ryakel/flight-budget)
[![License](https://img.shields.io/badge/license-MIT-green)]()

## Quick Start

```bash
# Using Docker Compose
docker-compose up -d

# Access at http://localhost:8181
```

## Features

- 📊 Import ForeFlight logbook (CSV) to track current hours
- ✈️ Calculate costs for multiple aircraft with wet/dry rates
- 📈 Visual budget breakdown with charts
- 💾 Save and load budget configurations
- 📄 Export budget reports to PDF
- 🎯 Track progress toward certification requirements

## Documentation

📚 **[Complete Documentation](docs/)**

### Getting Started
- **[Pre-Deployment Checklist](docs/PRE_DEPLOYMENT_CHECKLIST.md)** - ⭐ Start here! Setup guide for first deployment
- **[Quick Start Guide](docs/QUICK_START.md)** - Get running in 5 minutes
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Portainer setup with webhooks

### CI/CD & Automation
- **[GitHub Actions](docs/GITHUB_ACTIONS.md)** - CI/CD workflows and automation
- **[Docker Build Setup](docs/DOCKER_BUILD_SETUP.md)** - Semantic versioning and secrets
- **[Dependency Management](docs/DEPENDENCY_MANAGEMENT.md)** - How to update libraries
- **[Automated Updates](docs/AUTOMATED_DEPENDENCY_UPDATES.md)** - Renovate & Dependabot setup

### Technical Reference
- **[Container Setup](docs/CONTAINER_SETUP.md)** - Technical overview
- **[Project Structure](docs/PROJECT_STRUCTURE.md)** - Codebase layout
- **[TODO & Roadmap](docs/TODO.md)** - Planned features

## Project Structure

```
flight_budget/
├── app/                    # Application files (deployed in container)
│   ├── index.html         # Main HTML
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript
│   ├── libs/              # Vendored libraries
│   └── data/              # Persistent storage
├── docs/                   # Documentation
├── infrastructure/         # Docker & deployment configs
└── .github/               # CI/CD workflows
```

## Development

```bash
# Open app/index.html in a browser
open app/index.html

# Or use a local server
python3 -m http.server 8000 --directory app
```

## Deployment

### Docker (Recommended)

```bash
# Build
docker build -t ryakel/flight-budget:latest -f infrastructure/Dockerfile .

# Run
docker run -d -p 8181:80 ryakel/flight-budget:latest
```

### Portainer

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete Portainer setup with automated webhooks.

## Tech Stack

- **Frontend**: Pure HTML/CSS/JavaScript (no framework)
- **Charts**: Chart.js
- **CSV Parsing**: PapaParse
- **PDF Export**: html2pdf.js
- **Container**: nginx:alpine (~30MB)
- **Deployment**: Docker + Portainer

## Contributing

Contributions welcome! Please read our contributing guidelines first.

## License

[Add your license here]

## Support

- 📖 [Documentation](docs/)
- 🐛 [Report Issues](https://github.com/ryakel/flight-budget/issues)
- 💬 [Discussions](https://github.com/ryakel/flight-budget/discussions)

## Author

**ryakel**
- Docker Hub: [ryakel/flight-budget](https://hub.docker.com/r/ryakel/flight-budget)
- GitHub: [ryakel/flight-budget](https://github.com/ryakel/flight-budget)

---

**Made with ✈️ by pilots, for pilots**
