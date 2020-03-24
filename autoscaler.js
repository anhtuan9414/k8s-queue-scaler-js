const got = require('got');
const KubeAPI = require('kubernetes-client');
const Client = KubeAPI.Client1_13;
const Request = require('kubernetes-client/backends/request');
const { KubeConfig } = require('kubernetes-client');

module.exports = class Autoscaler {

  constructor(options = {
    messagesPerPod: 5,
    maxPods: 3,
    minPods: 1,
    scaleUpWait: 10000,
    scaleDownWait: 10000,
    pollPeriod: 10000,
    k8sNamespace: 'default',
    k8sDeployment: 'kubernetes-started',

  }) {
    const kubeconfig = new KubeConfig();
    console.log(kubeconfig);
    kubeconfig.loadFromDefault();
    // kubeconfig.loadFromString(JSON.stringify({
    //   apiVersion: 'v1',
    //   kind: 'Config',
    //   preferences: {},
    //   'current-context': 'gke_precise_us-east1-b_test-cluster',
    //   contexts: [
    //     {
    //       name: 'gke_precise_us-east1-b_test-cluster',
    //       context:  {
    //         cluster: 'gke_precise_us-east1-b_test-cluster',
    //         name: 'gke_precise_us-east1-b_test-cluster',
    //         user: 'gke_precise_us-east1-b_test-cluster'
    //       }
    //     }
    //   ],
    //   clusters: [
    //     {
    //       name: 'gke_precise_us-east1-b_test-cluster',
    //       cluster: {
    //         'certificate-authority-data': 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURDekNDQWZPZ0F3SUJBZ0lRWFNVcm9ncno0VHRpUDlCZTBxcDRVVEFOQmdrcWhraUc5dzBCQVFzRkFEQXYKTVMwd0t3WURWUVFERXlRMVlqVTROV1ptT1Mxak5tRXdMVFJtTWpVdE9ERTNNeTA1WVRObVl6UTRZMk13TjJJdwpIaGNOTWpBd016QXlNRFl6TXpFeFdoY05NalV3TXpBeE1EY3pNekV4V2pBdk1TMHdLd1lEVlFRREV5UTFZalU0Ck5XWm1PUzFqTm1Fd0xUUm1NalV0T0RFM015MDVZVE5tWXpRNFkyTXdOMkl3Z2dFaU1BMEdDU3FHU0liM0RRRUIKQVFVQUE0SUJEd0F3Z2dFS0FvSUJBUUNrM0M0RVAvRXlodHFjbk1mVm1IZVRHb3lkUXFEbXJXanlDV3Jwd3dPTQppOEVveWIvNU43YVRGd0t3QVdjN1Y0YmlLVktEUkVkNmVVRzVwL3BsZkZQRmdMcGhRR043MTVyYVlQSWRuWFBVClJxZ1liODUxQ3o1V29acmNJR25haFB0NmIycnFsUURhanliY0NxRktLcmRSM2ErUWpRb1N1RmpNRTB2bEtQUFMKY3BQTkJxZHpZWU44MGE3eU5ReVN6b3J5ZVZXeDhVUkk1b1dudFRFbUNoOXBvQ1lienhXUEhtSW5wYVlYOUphYQo1KzZELzFJN1g5amhmSXhCZzYwUm9JbUlwcFMzaFdzWTNHWTNRcWRzdFdpRVlibTNSMFJUd0toWlJuOTMvUHB5CkdVcWIyN2FJWVdiQ3BlTFBaZnh1NGl5MTdDK1IvRTU2alI0T0xmYlRtQXQ3QWdNQkFBR2pJekFoTUE0R0ExVWQKRHdFQi93UUVBd0lDQkRBUEJnTlZIUk1CQWY4RUJUQURBUUgvTUEwR0NTcUdTSWIzRFFFQkN3VUFBNElCQVFBcApxQzFjaXE0WlN4WHN6S3luS2kzQnJSVHUxMDdjSng5cFQxU2w4VXRFa3BORWQvZ3l0UkNkbVZrY3RRVFNyNDNKCnllWnMxdWE2MEVKTzNCNVRPWktsNmNLYU0vVXh1UndDV0pVOUgwU1RCU1dzVDE5YlNPMzYyVzFVZnZFbGRkNXgKNGkzNHVhUUk4VmhjamhMbHBVUGtONkM4NHdMaE14cEY1d2NlbDh4Y01XNXZZMjhTVDkvcy9DVlA4a3JGbk1Vcwp4LzdKMmZhWkNVOHFQRXRnMGczRXNmckxOWThqMFdtMDA1eS9NWWFGcTY1S1hDMncreXRtWVNKNEdrbk5SckIrCmVpdEZYRnpqNDIxTTQzLzdOTUNLRkljOXFRT2kxL1l4d3QxQ2prYmxmZ1QyVFoxOG5JYVVSYUs2NDNUaitxcTcKbHNDUnQ0TjIrRHdlL0RtUDFrWGMKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=',
    //         server: 'https://34.74.115.225'
    //       }
    //     }
    //   ],
    //   users: [
    //     {
    //       name: 'gke_precise_us-east1-b_test-cluster',
    //       user: {
    //         'auth-provider': {
    //           config: {
    //             "access-token": "ya29.a0Adw1xeW4uzzJ3xuApjFL0qvN0GkwXHxikP6FsV4JYhc143JGVr70hdbr1hcdcTOZKnOZWyq2a9q2MWzBJU7GmOb80yonDcGrL7fvn3CebM1WNzRovAWhEZsJ_lXicT8QNoZTh-9oY42fKrzIoTzqU4LJ6PtuBfLdcVyap_J4DOz2Kw",
    //             "cmd-args": "config config-helper --format=json",
    //             "cmd-path": "gcloud",
    //             "expiry-key": "{.credential.token_expiry}",
    //             "token-key": "{.credential.access_token}"
    //           }
    //         }
    //       }
    //     }
    //   ]
    // }));
    this.k8sApi = new Client({ backend: new Request({ kubeconfig }), version: '1.13' });
    // this.k8sApi = new Client({
    //   config: {
    //     url: process.env.K8S_CLUSTER_HOST,
    //     auth: {
    //       user: process.env.K8S_USER,
    //       pass: process.env.K8S_PASSWORD
    //     },
    //     insecureSkipTlsVerify: true
    //   },
    //   version: process.env.K8S_CLUSTER_VERSION
    // });
    this.options = options;
    this.lastScaleUpTime =  new Date().getTime();
    this.lastScaleDownTime =  new Date().getTime();
    this.messageCount =  0;
  }

  init() {
    console.log(
      `Initializing autoscaler with options: ${JSON.stringify(this.options)}`
    );
    this.poll();
  }

  async getMessageCount() {
    try {
      return 3;
    } catch (err) {
      console.error(`Failed to get message count: ${err.message}`);
      return null;
    }
  }

  poll() {
    setInterval(async () => {
      this.messageCount = await this.getMessageCount();

      if (typeof this.messageCount === 'number') {
        const now = new Date().getTime();

        if (this.messageCount >= this.options.messagesPerPod) {
          if (now - this.lastScaleUpTime > this.options.scaleUpWait) {
            await this.scaleUp();
            this.lastScaleUpTime = now;
          } else {
            console.log('Waiting for scale up cooldown');
          }
        }

        if (this.messageCount <= this.options.messagesPerPod) {
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

  async scaleUp() {
    const deployment = await this.getDeployment();

    if (deployment) {
      if (deployment.spec.replicas < this.options.maxPods) {
        let newReplicas = Math.ceil(
          this.messageCount / this.options.messagesPerPod
        );

        if (newReplicas > this.options.maxPods) {
          newReplicas = this.options.maxPods;
        }

        console.log('Scaling up');
        deployment.spec.replicas = newReplicas;
        await this.updateDeployment(deployment);
      } else if (deployment.spec.replicas > this.options.maxPods) {
        await this.scaleDown();
      } else {
        console.log('Max pods reached');
      }
    }
  }

  async scaleDown() {
    const deployment = await this.getDeployment();

    if (deployment) {
      if (deployment.spec.replicas > this.options.minPods) {
        let newReplicas = Math.ceil(
          this.messageCount / this.options.messagesPerPod
        );

        if (newReplicas < this.options.minPods) {
          newReplicas = this.options.minPods;
        }

        console.log('Scaling down');
        deployment.spec.replicas = newReplicas;
        await this.updateDeployment(deployment);
      } else if (deployment.spec.replicas < this.options.minPods) {
        await this.scaleUp();
      } else {
        console.log('Min pods reached');
      }
    }
  }

  async getDeployment() {
    try {
      console.log('Getting deployment');
      const deploymentResponse = await this.k8sApi.apis.apps.v1
        .namespaces(this.options.k8sNamespace)
        .deployments(this.options.k8sDeployment)
        .get();
      return deploymentResponse.body;
    } catch (err) {
      console.error(`Failed to get deployment: ${JSON.stringify(err)}`);
      return null;
    }
  }

  async updateDeployment(deployment) {
    try {
      console.log('Updating deployment');
      const updateResponse = await this.k8sApi.apis.apps.v1
        .namespaces(this.options.k8sNamespace)
        .deployments(this.options.k8sDeployment)
        .patch({ body: deployment });
      console.log(
        `Deployment updated. Response: ${JSON.stringify(updateResponse)}`
      );
    } catch (err) {
      console.error(`Failed to update deployment: ${JSON.stringify(err)}`);
    }
  }
}
