# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in DockAdmin, please report it responsibly.

### How to Report

1. **DO NOT** open a public GitHub issue for security vulnerabilities
2. Email your findings to **demlabz@gmail.com**
3. Include detailed steps to reproduce the vulnerability
4. Allow up to 48 hours for an initial response

### What to Expect

- We will acknowledge your report within 48 hours
- We will investigate and keep you updated on our progress
- Once fixed, we will publicly disclose the vulnerability and credit you (if desired)

## Security Best Practices

When deploying DockAdmin, please follow these security recommendations:

### Network Security

- **Never expose DockAdmin directly to the public internet** without proper authentication
- Use a reverse proxy (nginx, Traefik) with TLS/SSL
- Restrict network access using firewalls or Docker networks

### Credential Handling

- DockAdmin does **not** store database credentials persistently
- Credentials are held in memory only during the active session
- Sessions are invalidated on disconnect or server restart

### Docker Deployment

```yaml
# Example: Restrict to internal network only
services:
    dockadmin:
        image: dockadmin/dockadmin
        ports:
            - '127.0.0.1:3000:3000' # Bind to localhost only
```

### Read-Only Mode (Future)

For production database inspection, consider using read-only database credentials to prevent accidental data modification.

## Known Limitations

- DockAdmin is designed for **development and local use**
- It is NOT recommended for production database management without additional security layers
- Multi-statement SQL execution is restricted by default for safety
