/** PM2 ecosystem untuk SIPERBUN API (Linux/Windows dengan pm2). */
module.exports = {
  apps: [
    {
      name: 'siperbun-api',
      cwd: './apps/api',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '512M',
      time: true,
    },
  ],
};
