#!/bin/sh
set -e

PORT="${PORT:-10000}"
if ! echo "$PORT" | grep -Eq '^[0-9]+$' || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    echo "[BusTracker Startup Error] Invalid PORT specified: '$PORT'. Must be an integer between 1 and 65535." >&2
    exit 1
fi

if [ -z "$APP_KEY" ]; then
    echo "[BusTracker Startup Error] APP_KEY environment variable is required but missing or empty. Aborting startup." >&2
    exit 1
fi

echo "[BusTracker] Preparing runtime environment on port ${PORT}..."

# Substitute only ${PORT} from template, preserving all Nginx variables ($uri, $fastcgi_script_name, etc.)
sed "s/\${PORT}/${PORT}/g" /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Ensure storage directories exist with correct permissions
mkdir -p /var/www/html/storage/framework/cache/data \
         /var/www/html/storage/framework/sessions \
         /var/www/html/storage/framework/views \
         /var/www/html/storage/logs \
         /var/www/html/storage/app/public \
         /var/www/html/storage/app/private \
         /var/www/html/bootstrap/cache

chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Ensure storage symbolic link exists
if [ ! -L /var/www/html/public/storage ]; then
    php artisan storage:link --force
fi

# Discover packages and warm caches.
# Failures are fatal and not masked with || true.
echo "[BusTracker] Running package discovery and cache warmup..."
php artisan package:discover --ansi
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Start PHP-FPM in foreground daemon mode inside background job, capturing PID
echo "[BusTracker] Starting PHP-FPM..."
php-fpm -F &
PHP_FPM_PID=$!

# Start Nginx in foreground daemon mode inside background job, capturing PID
echo "[BusTracker] Starting Nginx on port ${PORT}..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Signal handler forwarding termination signals to both child processes
cleanup() {
    echo "[BusTracker] Termination signal received. Stopping services gracefully..."
    kill -TERM "$NGINX_PID" 2>/dev/null || true
    kill -TERM "$PHP_FPM_PID" 2>/dev/null || true
    wait "$NGINX_PID" 2>/dev/null || true
    wait "$PHP_FPM_PID" 2>/dev/null || true
    exit 0
}

trap cleanup TERM INT QUIT

# Process monitor: if either process dies, terminate the other and exit with error
while kill -0 "$PHP_FPM_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do
    sleep 2
done

echo "[BusTracker] Critical process terminated unexpectedly. Shutting down container..."
kill -TERM "$NGINX_PID" 2>/dev/null || true
kill -TERM "$PHP_FPM_PID" 2>/dev/null || true
wait "$NGINX_PID" 2>/dev/null || true
wait "$PHP_FPM_PID" 2>/dev/null || true

exit 1
