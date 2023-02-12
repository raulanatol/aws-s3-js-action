import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ObjectIdentifier } from '@aws-sdk/client-s3/dist-types/models/models_0';

export class S3 {

  awsBucketName: string;
  client: S3Client;

  constructor(awsRegion: string, awsBucketName: string) {
    this.awsBucketName = awsBucketName;
    this.client = new S3Client({
      region: awsRegion
    });
  }

  async emptyFolder(folder: string) {
    const objectsToRemove = await this.listObjects(folder);
    if (!objectsToRemove.length) {
      return;
    }

    const keysToRemove = objectsToRemove.map(object => ({ Key: object.Key }));
    await this.deleteObject(keysToRemove);
    console.log('Deleted', keysToRemove.length, 'files');
  }

  private async listObjects(folder: string) {
    const command = new ListObjectsV2Command({
      Bucket: this.awsBucketName,
      Prefix: folder
    });

    const result = await this.client.send(command);
    return result.Contents || [];
  }

  private deleteObject(keysToRemove: ObjectIdentifier[]) {
    const command = new DeleteObjectsCommand({
      Bucket: this.awsBucketName,
      Delete: { Objects: keysToRemove }
    });

    return this.client.send(command);
  }

  putObject(key: string, fileContent: Buffer) {
    const command = new PutObjectCommand({
      Bucket: this.awsBucketName,
      Key: key,
      Body: fileContent
    });

    return this.client.send(command);
  }
}
