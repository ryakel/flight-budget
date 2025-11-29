#!/bin/sh
set -e

# Configure nginx based on ENABLE_FAA_LOOKUP environment variable
if [ "$ENABLE_FAA_LOOKUP" = "true" ]; then
    echo "FAA Lookup enabled - configuring tail-lookup API proxy..."
    # Uncomment the tail-lookup API proxy block
    sed -i 's/# TAIL_LOOKUP_PROXY_START//g; s/# TAIL_LOOKUP_PROXY_END//g; s/#     /    /g' /etc/nginx/conf.d/default.conf
    # Remove the tail-lookup disabled block (it returns 503)
    sed -i '/# TAIL_LOOKUP_DISABLED_START/,/# TAIL_LOOKUP_DISABLED_END/d' /etc/nginx/conf.d/default.conf
else
    echo "FAA Lookup disabled - tail-lookup API proxy not configured"
    # Remove the commented tail-lookup API proxy block entirely
    sed -i '/# TAIL_LOOKUP_PROXY_START/,/# TAIL_LOOKUP_PROXY_END/d' /etc/nginx/conf.d/default.conf
    # Keep the tail-lookup disabled block (removes the comment markers)
    sed -i 's/# TAIL_LOOKUP_DISABLED_START//g; s/# TAIL_LOOKUP_DISABLED_END//g' /etc/nginx/conf.d/default.conf
fi

# Execute the original nginx entrypoint
exec /docker-entrypoint.sh "$@"
