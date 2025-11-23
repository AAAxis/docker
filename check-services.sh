#!/bin/bash

echo "=========================================="
echo "Checking Docker Container Status"
echo "=========================================="
sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=========================================="
echo "Checking Container Health (Internal)"
echo "=========================================="

echo -n "API (internal): "
sudo docker compose exec -T api curl -s http://127.0.0.1:5000/health 2>/dev/null || echo "❌ FAILED"

echo -n "SDK (internal): "
sudo docker compose exec -T sdk curl -s http://127.0.0.1:5000/health 2>/dev/null || echo "❌ FAILED"

echo -n "Sandbox (internal): "
sudo docker compose exec -T sandbox curl -s http://127.0.0.1:5000/health 2>/dev/null || echo "❌ FAILED"

echo -n "Payments (internal): "
sudo docker compose exec -T payments curl -s http://127.0.0.1:5001/ 2>/dev/null || echo "❌ FAILED"

echo -n "DALL-E (internal): "
sudo docker compose exec -T dalle curl -s http://127.0.0.1:5000/health 2>/dev/null || echo "❌ FAILED"

echo ""
echo "=========================================="
echo "Checking HTTPS Endpoints (External)"
echo "=========================================="

echo -n "API (https://api.roamjet.net/health): "
curl -s -k https://api.roamjet.net/health 2>/dev/null || echo "❌ FAILED"

echo -n "SDK (https://sdk.roamjet.net/health): "
curl -s -k https://sdk.roamjet.net/health 2>/dev/null || echo "❌ FAILED"

echo -n "Sandbox (https://sandbox.roamjet.net/health): "
curl -s -k https://sandbox.roamjet.net/health 2>/dev/null || echo "❌ FAILED"

echo -n "Payments (https://pay.roamjet.net/): "
curl -s -k https://pay.roamjet.net/ 2>/dev/null || echo "❌ FAILED"

echo -n "DALL-E (https://dalle.roamjet.net/health): "
curl -s -k https://dalle.roamjet.net/health 2>/dev/null || echo "❌ FAILED"

echo ""
echo "=========================================="
echo "Checking HTTP Redirects"
echo "=========================================="

echo -n "API HTTP redirect: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://api.roamjet.net/health 2>/dev/null)
if [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "308" ]; then
    echo "✅ Redirecting ($HTTP_CODE)"
else
    echo "❌ Not redirecting ($HTTP_CODE)"
fi

echo -n "SDK HTTP redirect: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://sdk.roamjet.net/health 2>/dev/null)
if [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "308" ]; then
    echo "✅ Redirecting ($HTTP_CODE)"
else
    echo "❌ Not redirecting ($HTTP_CODE)"
fi

echo ""
echo "=========================================="
echo "Checking Nginx Status"
echo "=========================================="
sudo docker compose exec -T nginx nginx -t 2>&1 | grep -q "successful" && echo "✅ Nginx config is valid" || echo "❌ Nginx config has errors"

echo ""
echo "=========================================="
echo "Recent Container Logs (last 5 lines)"
echo "=========================================="
echo "--- Nginx ---"
sudo docker logs --tail 5 nginx 2>&1 | tail -5
echo ""
echo "--- API ---"
sudo docker logs --tail 5 api 2>&1 | tail -5
echo ""
echo "--- SDK ---"
sudo docker logs --tail 5 sdk 2>&1 | tail -5

