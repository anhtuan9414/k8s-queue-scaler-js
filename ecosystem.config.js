module.exports = {
  apps: [{
    name: 'qa-crawl-manager-scaler',
    script: 'qa-crawl-manager-scaler.js',
    instances: 1,
    instance_var: 'INSTANCE_ID',
    exec_mode  : "cluster",
    max_memory_restart: "1G",
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }, {
      name: 'qa-crawl-workers-scaler',
      script: 'qa-crawl-workers-scaler.js',
      instances: 1,
      instance_var: 'INSTANCE_ID',
      exec_mode  : "cluster",
      max_memory_restart: "1G",
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }]
};
