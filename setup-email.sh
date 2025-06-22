#!/bin/bash

echo "Setting up email server for theholylabs.com..."

# Create necessary directories
mkdir -p docker-data/dms/mail-data
mkdir -p docker-data/dms/mail-state
mkdir -p docker-data/dms/mail-logs
mkdir -p docker-data/dms/config
mkdir -p docker-data/dms/ssl
mkdir -p docker-data/webmail

# Set proper permissions
sudo chown -R 5000:5000 docker-data/dms/mail-data
sudo chown -R 5000:5000 docker-data/dms/mail-state
sudo chown -R 5000:5000 docker-data/dms/mail-logs

echo "Starting email server..."
docker-compose up -d mailserver

# Wait for mailserver to be ready
echo "Waiting for mailserver to initialize..."
sleep 30

# Create email account for dima@theholylabs.com
echo "Creating email account dima@theholylabs.com..."
docker exec mailserver setup email add dima@theholylabs.com

# Create alias (optional)
echo "Creating postmaster alias..."
docker exec mailserver setup alias add postmaster@theholylabs.com dima@theholylabs.com

# Generate DKIM keys
echo "Generating DKIM keys..."
docker exec mailserver setup config dkim

# Display DKIM key for DNS configuration
echo "========================================="
echo "IMPORTANT: Add these DNS records to your domain:"
echo "========================================="
echo ""
echo "1. MX Record:"
echo "   Name: @"
echo "   Value: mail.theholylabs.com"
echo "   Priority: 10"
echo ""
echo "2. A Record:"
echo "   Name: mail"
echo "   Value: 69.197.134.25"
echo ""
echo "3. TXT Record (SPF):"
echo "   Name: @"
echo "   Value: v=spf1 mx ~all"
echo ""
echo "4. TXT Record (DMARC):"
echo "   Name: _dmarc"
echo "   Value: v=DMARC1; p=quarantine; rua=mailto:dima@theholylabs.com"
echo ""
echo "5. DKIM Record (will be generated after first run):"
echo "   Check the logs below for the DKIM key to add to DNS"
echo ""

# Show DKIM key
echo "DKIM Key (add this as TXT record):"
docker exec mailserver cat /tmp/docker-mailserver/opendkim/keys/theholylabs.com/mail.txt 2>/dev/null || echo "DKIM key not yet generated. Run this script again after the container is fully started."

echo ""
echo "========================================="
echo "Setup complete!"
echo "========================================="
echo ""
echo "Webmail access: https://mail.theholylabs.com"
echo "Email account: dima@theholylabs.com"
echo ""
echo "IMAP Settings:"
echo "  Server: mail.theholylabs.com"
echo "  Port: 993 (SSL) or 143 (non-SSL)"
echo ""
echo "SMTP Settings:"
echo "  Server: mail.theholylabs.com"
echo "  Port: 465 (SSL) or 587 (STARTTLS)"
echo ""
echo "Don't forget to:"
echo "1. Configure SSL certificates for mail.theholylabs.com"
echo "2. Add the DNS records shown above"
echo "3. Start the webmail container: docker-compose up -d webmail" 