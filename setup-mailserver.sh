#!/bin/bash

# Create necessary directories
mkdir -p docker-data/dms/config

# Set proper permissions
sudo chown -R 5000:5000 docker-data/dms/mail-data
sudo chown -R 5000:5000 docker-data/dms/mail-state
sudo chown -R 5000:5000 docker-data/dms/mail-logs

echo "Mailserver directories created and permissions set."
echo "You can now start ALL containers with: docker-compose up -d"
echo ""
echo "After the mailserver is running, add email accounts with:"
echo "docker exec mailserver setup email add user@theholylabs.com password"
echo ""
echo "To monitor all containers: docker-compose logs -f"
echo "To check status: docker-compose ps" 