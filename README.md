# Flight Training Budget Calculator

A web-based calculator to help pilots estimate costs for flight training certifications including Instrument Rating, Commercial Pilot License, and CFI.

[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://hub.docker.com/r/ryakel/flight-budget)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Quick Start

### Option 1: Run Locally (No Installation Required)

Simply open the HTML file in your browser:

```bash
# Clone or download the repository
git clone https://github.com/ryakel/flight-budget.git
cd flight-budget

# Open in your default browser
open app/index.html
# Or on Linux: xdg-open app/index.html
# Or on Windows: start app/index.html
```

All features work directly in the browser with no dependencies or server required!

### Option 2: Docker Deployment

For production hosting or self-hosting:

```bash
# Basic deployment (without FAA lookup)
docker run -d -p 8181:80 ryakel/flight-budget:latest

# Or with FAA lookup enabled (requires tail-lookup service)
docker-compose --profile faa-lookup up -d

# Access at http://localhost:8181
```

See [Deployment Guide](wiki/Deployment.md) and [infrastructure/examples/](infrastructure/examples/) for complete setup instructions.

## Features

- 🚀 **Guided Onboarding Wizard** - Three pathways: manual entry, ForeFlight import, or load saved budget
- 📊 Import ForeFlight logbook (CSV) to track current hours
- 🔍 **Optional FAA Aircraft Lookup** - Automatically verify US aircraft data from FAA registry
- ✈️ Calculate costs for multiple aircraft with wet/dry rates
- 📈 Visual budget breakdown with charts
- 💾 Save and load budget configurations
- 📄 Export budget reports to PDF
- 🎯 Track progress toward certification requirements
- 🏷️ Data source badges (FAA Verified / ForeFlight)

## Documentation

📚 **[Complete Documentation Wiki](wiki/Home.md)**

### Quick Links
- **[Quick Start Guide](wiki/Quick-Start.md)** - Get running in 5 minutes
- **[Onboarding Flow](wiki/Onboarding-Flow.md)** - New user wizard and setup guide
- **[Aircraft Management](wiki/Aircraft-Management.md)** - Aircraft setup and CSV import
- **[Pre-Deployment Checklist](wiki/Pre-Deployment-Checklist.md)** - Setup guide for first deployment
- **[Deployment Guide](wiki/Deployment.md)** - Portainer setup with webhooks
- **[Branch Strategy](wiki/Branch-Strategy.md)** - Git workflow and branching model

**[📖 View Full Wiki](wiki/Home.md)** for complete documentation including:
- Development guides and workflows
- Docker and container setup
- CI/CD automation
- Dependency management
- Project structure and history

## Project Structure

```
flight_budget/
├── app/                    # Application files (deployed in container)
│   ├── index.html         # Main HTML
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript
│   ├── libs/              # Vendored libraries
│   └── data/              # Persistent storage
├── wiki/                   # Documentation (GitHub Wiki)
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

See [DEPLOYMENT.md](wiki/Deployment.md) for complete Portainer setup with automated webhooks.

## Tech Stack

- **Frontend**: Pure HTML/CSS/JavaScript (no framework)
- **Charts**: Chart.js
- **CSV Parsing**: PapaParse
- **PDF Export**: html2pdf.js
- **Container**: nginx:alpine (~30MB)
- **Optional Services**:
  - [tail-lookup](https://github.com/ryakel/tail-lookup) - FAA aircraft data lookup (Python + SQLite, ~256MB)
- **Deployment**: Docker + Portainer

## Contributing

Contributions welcome! Please read our contributing guidelines first.

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

**Copyright (c) 2024-2025 FliteAxis**

See the [LICENSE](LICENSE) file for full details.

## Support

- 📖 [Documentation Wiki](wiki/Home.md)
- 🐛 [Report Issues](https://github.com/ryakel/flight-budget/issues)
- 💬 [Discussions](https://github.com/ryakel/flight-budget/discussions)

## Author

**ryakel**
- Docker Hub: [ryakel/flight-budget](https://hub.docker.com/r/ryakel/flight-budget)
- GitHub: [ryakel/flight-budget](https://github.com/ryakel/flight-budget)

---

**🛫 Made with 💙 by 👨‍✈️, for 🧑‍✈️**
