const KubeAPI = require('kubernetes-client');
const Client = KubeAPI.Client1_13;
const Request = require('kubernetes-client/backends/request');
const { KubeConfig } = require('kubernetes-client');
const bull = require('bull');
const Redis = require('ioredis');
const _ = require('lodash');

module.exports = class Autoscaler {
  constructor (options) {
    const kubeconfig = new KubeConfig();
    kubeconfig.loadFromString(JSON.stringify(options.k8sConfig));
    this.k8sApi = new Client({ backend: new Request({ kubeconfig }), version: '1.13' });
    this.lastScaleUpTime = new Date().getTime();
    this.lastScaleDownTime = new Date().getTime();
    this.messageCount = 0;
    this.options = options;
    this.queues = this.options.queueNames.map(name => bull(name, {
      createClient: () => new Redis(this.options.redisUrl)
    }));
  }

  init () {
    console.log(
      `Initializing autoscaler with options: ${JSON.stringify(this.options)}`
    );
    this.poll();
  }

  async getMessageCount () {
    try {
      let total = 0;
      for (let queue of this.queues) {
        console.log(`Job counts - queue [${queue.name}] - ${JSON.stringify(await queue.getJobCounts())}`);
        total += await queue.count();
      }
      return Promise.resolve(total);
    } catch (err) {
      console.error(`Failed to get message count: ${err.message}`);
      return null;
    }
  }

  poll () {
    setInterval(async () => {
      this.messageCount = await this.getMessageCount();

      if (typeof this.messageCount === 'number') {
        const now = new Date().getTime();

        if (this.messageCount > this.options.messagesPerPod) {
          if (now - this.lastScaleUpTime > this.options.scaleUpWait) {
            await this.scaleUp();
            this.lastScaleUpTime = now;
          } else {
            console.log('Waiting for scale up cooldown');
          }
        }

        if (this.messageCount < this.options.messagesPerPod) {
          if (now - this.lastScaleDownTime > this.options.scaleDownWait) {
            await this.scaleDown();
            this.lastScaleDownTime = now;
          } else {
            console.log('Waiting for scale down cooldown');
          }
        }
      }
    }, this.options.pollPeriod || 20000);
  }

  async scaleUp () {
    const deployment = await this.getDeployment();

    if (deployment) {
      let newReplicas = Math.ceil(
        this.messageCount / this.options.messagesPerPod
      );
      if (deployment.spec.replicas < newReplicas) {
        if (newReplicas > this.options.maxPods) {
          newReplicas = this.options.maxPods;
        }

        console.log(`Scaling up to ${newReplicas} - message counts in queue [${this.options.queueNames.join(', ')}]: ${this.messageCount}`);
        deployment.spec.replicas = newReplicas;
        await this.updateDeployment(deployment);
      } else if (deployment.spec.replicas > this.options.maxPods || deployment.spec.replicas > newReplicas) {
        await this.scaleDown();
      } else {
        console.log(`Max pods reached - newReplicas: ${newReplicas}`);
      }
    }
  }

  async scaleDown () {
    const deployment = await this.getDeployment();

    if (deployment) {
      let newReplicas = Math.ceil(
        this.messageCount / this.options.messagesPerPod
      );
      if (deployment.spec.replicas > newReplicas) {
        if (newReplicas < this.options.minPods) {
          newReplicas = this.options.minPods;
        }

        console.log(`Scaling down to ${newReplicas} - message counts in queue [${this.options.queueNames.join(', ')}]: ${this.messageCount}`);
        deployment.spec.replicas = newReplicas;
        await this.updateDeployment(deployment);
      } else if (deployment.spec.replicas < this.options.minPods || deployment.spec.replicas < newReplicas) {
        await this.scaleUp();
      } else {
        console.log(`Min pods reached - newReplicas: ${newReplicas}`);
      }
    }
  }

  async getDeployment () {
    try {
      console.log('Getting deployment');
      const deploymentResponse = await this.k8sApi.apis.apps.v1
        .namespaces(this.options.k8sNamespace)
        .deployments(this.options.k8sDeployment)
        .get();
      return deploymentResponse.body;
    } catch (err) {
      console.error(`Failed to get deployment`, err);
      return null;
    }
  }

  async updateDeployment (deployment) {
    try {
      console.log('Updating deployment');
      await this.k8sApi.apis.apps.v1
        .namespaces(this.options.k8sNamespace)
        .deployments(this.options.k8sDeployment)
        .patch({ body: deployment });
    } catch (err) {
      console.error(`Failed to update deployment`, err);
    }
  }
};
