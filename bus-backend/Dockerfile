# Stage 1: Base image with PHP 8.2 and all required extensions compiled
FROM php:8.2-fpm-alpine3.24 AS base

# Install Nginx, runtime C-libraries, and build dependencies for required PHP extensions
RUN apk upgrade --no-cache \
    && apk add --no-cache \
        nginx \
        libpq \
        libzip \
        libpng \
        libjpeg-turbo \
        freetype \
        libsodium \
    && apk add --no-cache --virtual .build-deps \
        postgresql-dev \
        libzip-dev \
        libpng-dev \
        libjpeg-turbo-dev \
        freetype-dev \
        libsodium-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_pgsql \
        pdo_mysql \
        zip \
        gd \
        bcmath \
        opcache \
        sodium \
    && apk del --no-cache .build-deps

# Copy Composer binary from official composer image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Stage 2: Vendor dependency builder on the shared base image
FROM base AS vendor

WORKDIR /app

COPY composer.json composer.lock ./

# Strict platform installation against the actual PHP runtime with compiled extensions
# No ignore-platform-reqs used
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-plugins \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader

# Stage 3: Final production runtime
FROM base AS runtime

WORKDIR /var/www/html

# Copy pre-built vendor dependencies
COPY --from=vendor /app/vendor /var/www/html/vendor

# Copy application source code
COPY . /var/www/html

# Strict platform check: verifies composer.lock requirements against final container
RUN composer check-platform-reqs --no-dev

# Copy custom configurations and entrypoint
COPY docker/nginx.conf.template /etc/nginx/nginx.conf.template
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/www.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/app.ini
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p /var/www/html/storage/framework/cache/data \
                /var/www/html/storage/framework/sessions \
                /var/www/html/storage/framework/views \
                /var/www/html/storage/logs \
                /var/www/html/storage/app/public \
                /var/www/html/storage/app/private \
                /var/www/html/bootstrap/cache \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

ENV PORT=10000
EXPOSE 10000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
