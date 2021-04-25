import { getInput, setFailed } from '@actions/core';
import { CloudFront, S3 } from 'aws-sdk';
import recursive from 'recursive-readdir';
import { readFile } from 'fs';
import { join } from 'path';

const REQUIRED = { required: true };
const getRequiredInput = (input) => getInput(input, REQUIRED);

interface InputParameters {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsBucketName: string;
  awsRegion: string;
  withDelete: boolean;
  target: string;
  source: string;
  withCloudfrontInvalidation: boolean;
  cloudFrontDistributionId: string;
  cloudFrontInvalidationPath: string;
}

const toBoolean = (input: string, defaultValue: boolean = false): boolean => {
  if (!input) {
    return defaultValue;
  }
  return input.toUpperCase() === 'TRUE';
};

const getInputParameters = (): InputParameters => ({
  awsAccessKeyId: getRequiredInput('AWS_ACCESS_KEY_ID'),
  awsSecretAccessKey: getRequiredInput('AWS_SECRET_ACCESS_KEY'),
  awsBucketName: getRequiredInput('AWS_BUCKET_NAME'),
  awsRegion: getRequiredInput('AWS_REGION'),
  source: getRequiredInput('SOURCE'),
  withDelete: toBoolean(getInput('WITH_DELETE'), false),
  target: getRequiredInput('TARGET'),
  withCloudfrontInvalidation: toBoolean(getInput('WITH_CLOUDFRONT_INVALIDATION'), false),
  cloudFrontDistributionId: getInput('AWS_CLOUDFRONT_DISTRIBUTION_ID'),
  cloudFrontInvalidationPath: getInput('AWS_CLOUDFRONT_INVALIDATION_PATH')
});

const getS3Client = ({
  awsAccessKeyId,
  awsSecretAccessKey,
  awsRegion
}: InputParameters) => {
  return new S3({
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    region: awsRegion
  });
};

const getCloudFrontClient = ({
  awsAccessKeyId,
  awsSecretAccessKey,
  awsRegion
}: InputParameters) => {
  return new CloudFront({
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    region: awsRegion
  });
};

const s3ListObjects = (s3Client, bucket, folder): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    s3Client.listObjectsV2({ Bucket: bucket, Prefix: folder }, (err, data) => {
      err ? reject(err) : resolve(data.Contents);
    });
  });
};

const emptyS3Folder = async (awsBucketName: string, target: string, s3Client: S3) => {
  const objectsToRemove = await s3ListObjects(s3Client, awsBucketName, target);
  if (!objectsToRemove.length) {
    return;
  }

  const keysToRemove = objectsToRemove.map(object => ({ Key: object.Key }));

  const deleteParams = {
    Bucket: awsBucketName,
    Delete: { Objects: keysToRemove }
  };

  await s3Client.deleteObjects(deleteParams).promise();
  console.log('Deleted', keysToRemove.length, 'files');
};

const syncFolder = async (inputParameters: InputParameters) => {
  const { source, withDelete, awsBucketName, target } = inputParameters;
  const s3Client = getS3Client(inputParameters);

  if (withDelete) {
    await emptyS3Folder(awsBucketName, target, s3Client);
  }

  return new Promise((resolve, reject) => {
    recursive(source, ((err, files: string[] = []) => {
      if (!files.length) {
        reject({ message: 'No files to sync' });
        return;
      }

      const removeBasePath = new RegExp(source);
      for (const filePath of files) {
        console.log(filePath);
        readFile(filePath, (error, fileContent) => {
          if (error) {
            throw error;
          }

          const filename = filePath.replace(removeBasePath, '');
          const key = join(target, filename);
          s3Client.putObject({
            Bucket: awsBucketName,
            Key: key,
            Body: fileContent
          }, () => {
            console.log(`Successfully uploaded '${filename}' to ${key}!`);
          });
        });
      }
      resolve(true);
    }));
  });
};

async function invalidateCache(inputParameters: InputParameters) {
  if (!inputParameters.cloudFrontDistributionId || !inputParameters.cloudFrontInvalidationPath) {
    throw new Error('Need AWS_CLOUDFRONT_DISTRIBUTION_ID and AWS_CLOUDFRONT_INVALIDATION_PATH to perform the invalidation');
  }
  const cloudfrontClient = getCloudFrontClient(inputParameters);
  return new Promise((resolve, reject) => {
    cloudfrontClient.createInvalidation({
      DistributionId: inputParameters.cloudFrontDistributionId,
      InvalidationBatch: {
        CallerReference: `Action-${new Date().getTime()}`,
        Paths: {
          Quantity: 1,
          Items: [
            inputParameters.cloudFrontInvalidationPath
          ]
        }
      }
    }, (err) => {
      err ? reject(err) : resolve('Invalidation done');
    });
  });
}

async function run(): Promise<void> {
  try {
    const inputParameters = getInputParameters();
    await syncFolder(inputParameters);
    if (inputParameters.withCloudfrontInvalidation) {
      await invalidateCache(inputParameters);
    }
  } catch (error) {
    setFailed(error.message);
  }
}

run().catch(console.error);
