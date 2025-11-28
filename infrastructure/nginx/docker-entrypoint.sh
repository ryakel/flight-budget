#!/bin/sh
set -e

# Configure nginx based on ENABLE_FAA_LOOKUP environment variable
if [ "$ENABLE_FAA_LOOKUP" = "true" ]; then
    echo "FAA Lookup enabled - configuring ARLA API proxy..."
    # Uncomment the ARLA API proxy block
    sed -i 's/# ARLA_PROXY_START//g; s/# ARLA_PROXY_END//g; s/#     /    /g' /etc/nginx/conf.d/default.conf
    # Remove the ARLA disabled block (it returns 503)
    sed -i '/# ARLA_DISABLED_START/,/# ARLA_DISABLED_END/d' /etc/nginx/conf.d/default.conf
else
    echo "FAA Lookup disabled - ARLA API proxy not configured"
    # Remove the commented ARLA API proxy block entirely
    sed -i '/# ARLA_PROXY_START/,/# ARLA_PROXY_END/d' /etc/nginx/conf.d/default.conf
    # Keep the ARLA disabled block (removes the comment markers)
    sed -i 's/# ARLA_DISABLED_START//g; s/# ARLA_DISABLED_END//g' /etc/nginx/conf.d/default.conf
fi

# Execute the original nginx entrypoint
exec /docker-entrypoint.sh "$@"
