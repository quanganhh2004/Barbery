#!/bin/sh

echo "Start AI service..."
python3 -m uvicorn barbery_ai.main:app --host 127.0.0.1 --port 8001 &

sleep 5

echo "Prepare Laravel..."
php artisan key:generate --force || true
php artisan config:clear || true
php artisan cache:clear || true
php artisan view:clear || true
php artisan route:clear || true


echo "Start Laravel server..."
exec php artisan serve --host=0.0.0.0 --port=${PORT:-10000}
