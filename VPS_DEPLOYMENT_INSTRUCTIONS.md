# VPS Cloud ERP - Deployment Instructions

This guide provides instructions on how to deploy the Node.js backend server to your Hostinger KVM VPS.

## Prerequisites

1.  **Hostinger KVM VPS** running Ubuntu 22.04 or 24.04.
2.  **SSH Access** to your VPS (e.g., using PuTTY or the terminal).
3.  A domain name pointing to your VPS IP address (optional but recommended for SSL).

## Step 1: Initial VPS Server Setup

SSH into your VPS as `root`:
```bash
ssh root@your_vps_ip
```

Update system packages:
```bash
apt update && apt upgrade -y
```

Install essential tools:
```bash
apt install curl git ufw -y
```

## Step 2: Install Node.js & NPM

We will use NodeSource to install a modern Node.js version (e.g., v20):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

Verify installation:
```bash
node -v
npm -v
```

## Step 3: Install & Configure MySQL Server

Install MySQL:
```bash
apt install mysql-server -y
```

Secure the MySQL installation:
```bash
mysql_secure_installation
```
*(Follow the prompts. Set a strong root password, remove anonymous users, disallow root login remotely, remove test database).*

Log into MySQL to create a user and database for the ERP:
```bash
mysql -u root -p
```

```sql
CREATE DATABASE badone_erp;
CREATE USER 'erp_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON badone_erp.* TO 'erp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Step 4: Transfer Project Files

You need to transfer the `/server` folder to your VPS. You can use SCP, FileZilla (SFTP), or Git.
For example, create a folder `/var/www/erp-backend` on the VPS and upload the `/server` folder contents there.

## Step 5: Install Project Dependencies

Navigate to your project directory on the VPS:
```bash
cd /var/www/erp-backend
npm install
```

## Step 6: Configure Environment Variables

Create the `.env` file in your project directory:
```bash
nano .env
```
Add your production configuration:
```env
PORT=5000
DB_HOST=localhost
DB_USER=erp_user
DB_PASSWORD=YOUR_STRONG_PASSWORD
DB_NAME=badone_erp
JWT_SECRET=generate_a_very_long_secure_random_string_here
```

## Step 7: Setup PM2 for Process Management

PM2 will keep your Node.js server running in the background and restart it automatically if it crashes or if the VPS reboots.

```bash
npm install -g pm2
pm2 start server.js --name "erp-backend"
pm2 save
pm2 startup
```
Run the command outputted by `pm2 startup` to configure PM2 to start on boot.

## Step 8: Setup Nginx as a Reverse Proxy

Install Nginx:
```bash
apt install nginx -y
```

Create a new Nginx configuration file:
```bash
nano /etc/nginx/sites-available/erp-backend
```

Paste the following configuration (replace `yourdomain.com` with your domain or VPS IP):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration and restart Nginx:
```bash
ln -s /etc/nginx/sites-available/erp-backend /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

## Step 9: Firewall Configuration (UFW)

Allow SSH, HTTP, and HTTPS traffic:
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## Step 10: SSL Setup (Optional but Highly Recommended)

If you have a domain pointing to your VPS, use Certbot to get a free SSL certificate from Let's Encrypt:
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d yourdomain.com
```

## Verification

Your backend API should now be accessible at `http://yourdomain.com/api/health` (or `https://yourdomain.com/api/health` if SSL is enabled). It should return `SERVER RUNNING`.

You can now proceed to update your Electron app frontend to point to this new VPS URL!
