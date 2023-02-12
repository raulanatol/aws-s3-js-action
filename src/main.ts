import { debug, info, setFailed } from '@actions/core';
import recursive from 'recursive-readdir';
import { readFile } from 'fs';
import { join } from 'path';
import { S3 } from './S3';
import { getInputParameters, InputParameters } from './parameters';
import { CloudFront } from './CloudFront';

const syncFolder = async (s3: S3, inputParameters: InputParameters) => {
  const { source, withDelete, target } = inputParameters;

  if (withDelete) {
    await s3.emptyFolder(target);
  }

  return new Promise((resolve, reject) => {
    recursive(source, ((err, files: string[] = []) => {
      if (!files.length) {
        reject({ message: 'No files to sync' });
        return;
      }

      const removeBasePath = new RegExp(source);
      for (const filePath of files) {
        debug(filePath);
        readFile(filePath, async (error, fileContent) => {
          if (error) {
            throw error;
          }

          const filename = filePath.replace(removeBasePath, '');
          const key = join(target, filename);
          await s3.putObject(key, fileContent);
        });
      }
      resolve(true);
    }));
  });
};

const invalidateCache = async (inputParameters: InputParameters) => {
  if (!inputParameters.cloudFrontDistributionId || !inputParameters.cloudFrontInvalidationPath) {
    throw new Error('Need AWS_CLOUDFRONT_DISTRIBUTION_ID and AWS_CLOUDFRONT_INVALIDATION_PATH to perform the invalidation');
  }

  const cloudFront = new CloudFront(inputParameters.awsRegion);
  await cloudFront.invalidateCache(inputParameters.cloudFrontDistributionId, inputParameters.cloudFrontInvalidationPath);
  info('Invalidation done');
};

async function run(): Promise<void> {
  try {
    const inputParameters = getInputParameters();
    const s3 = new S3(inputParameters.awsRegion, inputParameters.awsBucketName);
    await syncFolder(s3, inputParameters);
    if (inputParameters.withCloudfrontInvalidation) {
      await invalidateCache(inputParameters);
    }
  } catch (error: any) {
    setFailed(error.message);
  }
}

run().catch(console.error);
