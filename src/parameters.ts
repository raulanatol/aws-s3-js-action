import { getInput } from '@actions/core';

export interface InputParameters {
  awsBucketName: string;
  awsRegion: string;
  withDelete: boolean;
  target: string;
  source: string;
  withCloudfrontInvalidation: boolean;
  cloudFrontDistributionId: string;
  cloudFrontInvalidationPath: string;
}

const REQUIRED = { required: true };
const getRequiredInput = (input) => getInput(input, REQUIRED);

const toBoolean = (input: string, defaultValue: boolean = false): boolean => {
  if (!input) {
    return defaultValue;
  }
  return input.toUpperCase() === 'TRUE';
};

export const getInputParameters = (): InputParameters => ({
  awsBucketName: getRequiredInput('AWS_BUCKET_NAME'),
  awsRegion: getRequiredInput('AWS_REGION'),
  source: getRequiredInput('SOURCE'),
  withDelete: toBoolean(getInput('WITH_DELETE'), false),
  target: getRequiredInput('TARGET'),
  withCloudfrontInvalidation: toBoolean(getInput('WITH_CLOUDFRONT_INVALIDATION'), false),
  cloudFrontDistributionId: getInput('AWS_CLOUDFRONT_DISTRIBUTION_ID'),
  cloudFrontInvalidationPath: getInput('AWS_CLOUDFRONT_INVALIDATION_PATH')
});
