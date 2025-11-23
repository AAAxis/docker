#!/bin/bash

echo "=== API Debugging Script ==="
echo "Checking Docker containers and API status..."
echo

echo "1. Container status:"
sudo docker compose ps

echo
echo "2. Checking if new routes exist in container:"
sudo docker compose exec api grep -n "api/public/countries" server.py || echo "Route not found in server.py"

echo
echo "3. Container logs (last 20 lines):"
sudo docker compose logs api --tail 20

echo
echo "4. Environment variables:"
sudo docker compose exec api printenv | grep AIRALO || echo "No AIRALO env vars found"

echo
echo "5. Testing health endpoint:"
sudo docker compose exec api curl -s http://127.0.0.1:5000/health || echo "Health endpoint failed"

echo
echo "6. Testing countries endpoint:"
sudo docker compose exec api curl -s http://127.0.0.1:5000/api/public/countries || echo "Countries endpoint failed"

echo
echo "7. Port check:"
sudo docker compose exec api netstat -tlnp | grep 5000 || echo "Port 5000 not listening"

echo
echo "=== Debug complete ==="
