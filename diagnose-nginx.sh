#!/bin/bash

echo "=========================================="
echo "NGINX DIAGNOSTICS"
echo "=========================================="

echo ""
echo "1. Checking nginx container status:"
sudo docker ps | grep nginx

echo ""
echo "2. Checking nginx container logs (last 20 lines):"
sudo docker logs nginx --tail 20

echo ""
echo "3. Testing nginx config inside container:"
sudo docker compose exec -T nginx nginx -t 2>&1

echo ""
echo "4. Checking if nginx process is running inside container:"
sudo docker compose exec -T nginx ps aux | grep nginx || echo "No nginx process found!"

echo ""
echo "5. Checking if ports 80 and 443 are listening:"
sudo docker compose exec -T nginx netstat -tlnp 2>/dev/null | grep -E ':80|:443' || sudo docker compose exec -T nginx ss -tlnp 2>/dev/null | grep -E ':80|:443' || echo "Cannot check ports"

echo ""
echo "6. Checking SSL certificate files:"
echo "API certificate:"
sudo docker compose exec -T nginx ls -la /etc/letsencrypt/live/api.roamjet.net/ 2>&1 | head -5
echo ""
echo "SDK certificate:"
sudo docker compose exec -T nginx ls -la /etc/letsencrypt/live/sdk.roamjet.net/ 2>&1 | head -5
echo ""
echo "Pay certificate:"
sudo docker compose exec -T nginx ls -la /etc/letsencrypt/live/pay.roamjet.net/ 2>&1 | head -5
echo ""
echo "Sandbox certificate:"
sudo docker compose exec -T nginx ls -la /etc/letsencrypt/live/sandbox.roamjet.net/ 2>&1 | head -5
echo ""
echo "DALL-E certificate:"
sudo docker compose exec -T nginx ls -la /etc/letsencrypt/live/dalle.roamjet.net/ 2>&1 | head -5

echo ""
echo "7. Testing localhost connection:"
echo -n "HTTP (port 80): "
sudo docker compose exec -T nginx curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "FAILED"
echo ""
echo -n "HTTPS (port 443): "
sudo docker compose exec -T nginx curl -s -k -o /dev/null -w "%{http_code}" https://localhost/ 2>/dev/null || echo "FAILED"

echo ""
echo "8. Checking host port bindings:"
sudo netstat -tlnp 2>/dev/null | grep -E ':80 |:443 ' || sudo ss -tlnp 2>/dev/null | grep -E ':80 |:443 ' || echo "Cannot check host ports"

