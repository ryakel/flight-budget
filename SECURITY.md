# Security Policy

## Reporting a Vulnerability

**Please do not publicly disclose security vulnerabilities.** Instead, follow this process:

1. **Email the maintainer** at your earliest convenience with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if you have one)

2. **What to expect**:
   - Acknowledgment within 48 hours
   - Updates on investigation progress
   - Estimated timeline for fix
   - Credit in security advisory (unless you prefer anonymity)

3. **After the fix**:
   - Security advisory published on GitHub
   - New version released with fix
   - Credit given to reporter

## Supported Versions

Flight Budget follows semantic versioning. Security updates are provided for:

- **Latest version**: Full support (features, bugs, security)
- **Previous minor versions**: Security fixes only
- **Older versions**: No active support (users should upgrade)

## Security Best Practices

When using Flight Budget:

### For Users
- Keep your deployment updated to the latest version
- If using Docker: Pull latest images regularly
- Store `.env` files securely (never commit to version control)
- Change default passwords in production
- Use strong credentials for any database connections

### For Deployments
- Use HTTPS/TLS for all network traffic
- Run containers with appropriate resource limits
- Keep base Docker images updated
- Monitor container logs for errors
- Restrict network access to sensitive services
- Use secrets management for sensitive data

### For Development
- Always validate user input
- Sanitize CSV imports
- Use Content Security Policy (CSP) headers
- Avoid storing sensitive data in browser storage
- Keep dependencies updated

## Security Considerations

### Data Storage
- All data is stored locally (browser storage or CSV files)
- No data is sent to external servers (except optional FAA lookup)
- Personal information never leaves your deployment

### Third-party Dependencies
- Dependencies are regularly updated via Dependabot
- Security advisories are reviewed and addressed promptly
- Minimal third-party dependencies to reduce attack surface

### Container Security
- Docker images use lightweight `alpine` base
- No root access needed for normal operation
- Regular security scanning of Docker images

## Known Limitations

- No authentication/authorization built-in (single-user by design)
- No encryption of local storage (relies on browser security)
- CSV files are parsed entirely in memory (large files may cause issues)

## Contact

For security concerns, contact the maintainer directly. For general support:

- GitHub Issues: [Report a bug](https://github.com/ryakel/flight-budget/issues)
- GitHub Discussions: [Ask a question](https://github.com/ryakel/flight-budget/discussions)
- Documentation: [Wiki](https://github.com/ryakel/flight-budget/wiki)

---

**Thank you for helping keep Flight Budget secure!**
