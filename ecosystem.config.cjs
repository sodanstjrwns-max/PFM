module.exports = {
  apps: [{
    name: 'pfm',
    script: 'npx',
    args: 'wrangler pages dev dist --d1=pfm-production --r2=pfm-assets --local --ip 0.0.0.0 --port 3000',
    env: { NODE_ENV: 'development' },
    watch: false,
    instances: 1,
    exec_mode: 'fork'
  }]
}
