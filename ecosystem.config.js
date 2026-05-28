module.exports = {
  apps: [
    {
      name: 'badone-erp-api',
      script: './server/server.js',
      instances: 'max', // Scale to max CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        // Update these DB credentials in the VPS .env file
      }
    }
  ]
};
