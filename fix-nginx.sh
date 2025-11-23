#!/bin/bash

echo "=========================================="
echo "FIXING NGINX"
echo "=========================================="

echo ""
echo "1. Stopping nginx container:"
sudo docker compose stop nginx

echo ""
echo "2. Checking nginx logs for errors:"
sudo docker logs nginx --tail 50 2>&1 | tail -20

echo ""
echo "3. Testing nginx config:"
sudo docker compose run --rm nginx nginx -t

echo ""
echo "4. Restarting nginx:"
sudo docker compose up -d nginx

echo ""
echo "5. Waiting 3 seconds for nginx to start..."
sleep 3

echo ""
echo "6. Checking nginx status:"
sudo docker ps | grep nginx

echo ""
echo "7. Checking nginx logs after restart:"
sudo docker logs nginx --tail 10

echo ""
echo "8. Testing if nginx is responding:"
echo -n "HTTP test: "
curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "FAILED"
echo ""
echo -n "HTTPS test: "
curl -s -k -o /dev/null -w "%{http_code}" https://localhost/ 2>/dev/null || echo "FAILED"

echo ""
echo "=========================================="
echo "If nginx still fails, check:"
echo "1. SSL certificates exist: ls -la /etc/letsencrypt/live/"
echo "2. Certificate permissions: sudo chmod 644 /etc/letsencrypt/live/*/fullchain.pem"
echo "3. Certificate key permissions: sudo chmod 600 /etc/letsencrypt/live/*/privkey.pem"
echo "=========================================="

