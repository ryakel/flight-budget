# Flight Training Budget Calculator

A web-based calculator to help pilots estimate costs for flight training certifications including Instrument Rating, Commercial Pilot License, and CFI.

[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://hub.docker.com/r/ryakel/flight-budget)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

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
# Using Docker Compose
docker-compose up -d

# Access at http://localhost:8181
```

See [Deployment Guide](wiki/Deployment.md) for complete setup instructions.

## Features

- 📊 Import ForeFlight logbook (CSV) to track current hours
- ✈️ Calculate costs for multiple aircraft with wet/dry rates
- 📈 Visual budget breakdown with charts
- 💾 Save and load budget configurations
- 📄 Export budget reports to PDF
- 🎯 Track progress toward certification requirements

## Documentation

📚 **[Complete Documentation Wiki](wiki/Home.md)**

### Quick Links
- **[Quick Start Guide](wiki/Quick-Start.md)** - Get running in 5 minutes
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
- **Deployment**: Docker + Portainer

## Contributing

Contributions welcome! Please read our contributing guidelines first.

## License

This project is licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-nc-sa/4.0/).


**Terms**:
- ✅ **Attribution Required**: You must give credit to the original author
- ❌ **Non-Commercial**: No commercial use without permission
- 🔄 **ShareAlike**: Derivative works must use the same license

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
