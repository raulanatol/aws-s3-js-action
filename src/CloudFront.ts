import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

export class CloudFront {
  client: CloudFrontClient;

  constructor(awsRegion: string) {
    this.client = new CloudFrontClient({ region: awsRegion });
  }

  invalidateCache(distributionId: string, invalidationPath: string) {
    const command = new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `Action-${Date.now()}`,
        Paths: {
          Quantity: 1,
          Items: [
            invalidationPath
          ]
        }
      }
    });

    return this.client.send(command);
  }
}
