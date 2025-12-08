module.exports = {
  apps: [{
    name: 'axeso',
    script: 'npm',
    args: 'start',
    cwd: '/home/cyberpol/web/visitantes.cyberpol.com.py/public_html',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    },
    // PM2 cargará automáticamente el .env si está en el directorio de trabajo
    // Next.js también carga el .env automáticamente
    error_file: '/root/.pm2/logs/axeso-error.log',
    out_file: '/root/.pm2/logs/axeso-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
    // Variables de entorno específicas (Next.js las carga del .env automáticamente)
    // Pero podemos especificarlas aquí si es necesario
    watch: false,
    ignore_watch: [
      'node_modules',
      '.next',
      '.git',
      '*.log'
    ]
  }]
};

