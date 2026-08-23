module.exports = {
  apps: [
    {
      name: 'octopus-clipboard-api',
      script: './server.js',
      instances: 'max', // Scale to all CPU cores automatically
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
