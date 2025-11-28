# Flight Budget Calculator - Production Dockerfile
# Base: nginx:alpine for minimal footprint (~25MB)

FROM nginx:alpine

# Metadata
LABEL maintainer="ryakel"
LABEL description="Flight Training Budget Calculator - Static Web App"
LABEL version="1.0"

# Install wget for health checks
RUN apk add --no-cache wget

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy custom nginx configuration and entrypoint
COPY infrastructure/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY infrastructure/nginx/docker-entrypoint.sh /usr/local/bin/flight-budget-entrypoint.sh

# Copy application files
COPY app/ /usr/share/nginx/html/

# Make entrypoint executable
RUN chmod +x /usr/local/bin/flight-budget-entrypoint.sh

# Set proper permissions for web content
RUN find /usr/share/nginx/html -type d -exec chmod 755 {} \; && \
    find /usr/share/nginx/html -type f -exec chmod 644 {} \; && \
    chown -R nginx:nginx /usr/share/nginx/html

# Set working directory
WORKDIR /usr/share/nginx/html

# Expose port 80 (internal)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Use custom entrypoint to configure nginx based on environment
ENTRYPOINT ["/usr/local/bin/flight-budget-entrypoint.sh"]

# Start nginx (runs as root, worker processes run as nginx user)
CMD ["nginx", "-g", "daemon off;"]
