# ARUS Deployment Guide

This guide covers deploying the ARUS (Marine Predictive Maintenance & Scheduling) system using Docker Compose with production-ready configurations.

## Quick Start

1. **Copy environment configuration:**
   ```bash
   cp .env.example .env
   ```

2. **Edit environment variables:**
   ```bash
   nano .env
   ```
   Configure your database passwords, domain, and API keys.

3. **Deploy the system:**
   ```bash
   ./deploy.sh deploy
   ```

4. **Access the application:**
   - Main application: `http://localhost` (or your configured domain)
   - With monitoring: Prometheus at `:9090`, Grafana at `:3000`

## Architecture

The deployment includes:

- **ARUS Application**: Node.js/Express app with React frontend
- **PostgreSQL Database**: Primary data storage with automated backups
- **Caddy Reverse Proxy**: SSL termination, load balancing, security headers
- **Monitoring Stack** (optional): Prometheus + Grafana for observability

## Deployment Scripts

### Deploy Script Usage

```bash
./deploy.sh [OPTIONS] COMMAND

Commands:
  deploy      Deploy the ARUS system
  start       Start services
  stop        Stop services
  restart     Restart services
  logs        View logs
  status      Check service status
  backup      Backup database
  restore     Restore from backup
  clean       Clean Docker resources

Options:
  --production    Production environment
  --monitoring    Include Prometheus/Grafana
  --domain        Custom domain for SSL
```

### Examples

```bash
# Basic deployment
./deploy.sh deploy

# Production with monitoring
./deploy.sh deploy --production --monitoring

# Custom domain with SSL
./deploy.sh deploy --domain your-domain.com

# View logs
./deploy.sh logs

# Backup database
./deploy.sh backup
```

## Configuration

### Environment Variables

Key variables in `.env`:

```bash
# Database
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgresql://arus_user:password@postgres:5432/arus

# Application
SESSION_SECRET=your_session_secret
OPENAI_API_KEY=your_openai_key  # Optional

# Domain (for SSL)
DOMAIN=your-domain.com
```

### SSL/HTTPS

Caddy automatically handles SSL certificates via Let's Encrypt when you set a proper domain:

```bash
export DOMAIN=your-domain.com
./deploy.sh deploy --domain your-domain.com
```

### Monitoring

Enable monitoring stack:

```bash
./deploy.sh deploy --monitoring
```

Access:
- **Prometheus**: `http://your-domain:9090`
- **Grafana**: `http://your-domain:3000` (admin/admin)

## Production Considerations

### Security

1. **Change default passwords** in `.env`
2. **Configure firewall** to restrict access to necessary ports
3. **Regular updates** of base images
4. **Database backups** scheduled regularly

### Performance

1. **Resource limits** configured in docker-compose.yml
2. **PostgreSQL tuning** in init-db.sql
3. **Caddy caching** and compression enabled
4. **Health checks** for all services

### Monitoring

1. **Application metrics** at `/api/metrics`
2. **Prometheus alerting** (configure as needed)
3. **Log aggregation** via Docker logging drivers
4. **Database performance** monitoring

## Troubleshooting

### Service Health

```bash
# Check all service status
./deploy.sh status

# View logs for debugging
./deploy.sh logs

# Check specific service
docker-compose logs arus-app
```

### Database Issues

```bash
# Check database connectivity
docker-compose exec postgres pg_isready -U arus_user

# Access database shell
docker-compose exec postgres psql -U arus_user arus

# Backup/restore
./deploy.sh backup
./deploy.sh restore backup_20241225_120000.sql
```

### SSL Certificate Issues

1. Ensure domain points to your server
2. Check Caddy logs: `docker-compose logs caddy`
3. Verify port 80/443 are accessible

### Application Debugging

```bash
# Check application logs
docker-compose logs arus-app

# Restart specific service
docker-compose restart arus-app

# Rebuild and restart
docker-compose up -d --build arus-app
```

## Maintenance

### Regular Tasks

1. **Database backups**: Schedule `./deploy.sh backup`
2. **Log rotation**: Configured automatically in Caddy
3. **Image updates**: `docker-compose pull && ./deploy.sh restart`
4. **Security patches**: Regular base image updates

### Scaling

For high-availability deployments:

1. **Database clustering**: Consider PostgreSQL HA setup
2. **Load balancing**: Multiple ARUS app instances
3. **Shared storage**: For file uploads/exports
4. **Monitoring**: Enhanced alerting and dashboards

## Support

For deployment issues:
1. Check logs: `./deploy.sh logs`
2. Verify configuration: `./deploy.sh status`
3. Review this documentation
4. Check Docker/Compose documentation for container issues