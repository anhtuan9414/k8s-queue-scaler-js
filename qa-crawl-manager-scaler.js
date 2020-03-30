const Autoscaler = require('./autoscaler');
const fs = require('fs');
const path = require('path');
const auto = new Autoscaler({
  messagesPerPod: 20,
  maxPods: 5,
  minPods: 1,
  scaleUpWait: 120000,
  scaleDownWait: 120000,
  pollPeriod: 180000,
  k8sNamespace: 'default',
  k8sDeployment: 'qa-plat-crawl-manager-deployment',
  redisUrl: 'redis://127.0.0.1:6379/',
  queueName: 'CRAWL_RESPONSE_QUEUE_NAME',
  k8sConfig: {
    apiVersion: 'v1',
    kind: 'Config',
    preferences: {},
    'current-context': 'gke_precise_us-central1-a_qa-hd-bpo-cluster',
    contexts: [
      {
        name: 'gke_precise_us-central1-a_qa-hd-bpo-cluster',
        context:  {
          cluster: 'gke_precise_us-central1-a_qa-hd-bpo-cluster',
          name: 'gke_precise_us-central1-a_qa-hd-bpo-cluster',
          user: 'gke_precise_us-central1-a_qa-hd-bpo-cluster'
        }
      }
    ],
    clusters: [
      {
        name: 'gke_precise_us-central1-a_qa-hd-bpo-cluster',
        cluster: {
          'certificate-authority-data': Buffer.from(fs.readFileSync(path.join(__dirname, './qa_cluster.pem'), 'utf8')).toString('base64'),
          server: 'https://34.66.62.102'
        }
      }
    ],
    users: [
      {
        name: 'gke_precise_us-central1-a_qa-hd-bpo-cluster',
        user: {
          'auth-provider': {
            config: {
              "access-token": "{.credential.access_token}",
              "cmd-args": "config config-helper --format=json",
              "cmd-path": "gcloud",
              "expiry-key": "{.credential.token_expiry}",
              "token-key": "{.credential.access_token}"
            }
          }
        }
      }
    ]
  }
});

auto.init();