import { getInput, setFailed } from '@actions/core';

const s3 = require('s3');

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
}

const toBoolean = (input: string, defaultValue: boolean = false): boolean => {
  if (!input) {
    return defaultValue;
  }
  return input.toUpperCase() === 'TRUE';
};

const getInputParameters = (): InputParameters => ({
  awsAccessKeyId: getRequiredInput('AWS_ACCESS_KEY_ID'),
  awsBucketName: getRequiredInput('AWS_SECRET_ACCESS_KEY'),
  awsSecretAccessKey: getRequiredInput('AWS_BUCKET_NAME'),
  awsRegion: getRequiredInput('AWS_REGION'),
  source: getRequiredInput('SOURCE'),
  withDelete: toBoolean(getInput('WITH_DELETE'), false),
  target: getRequiredInput('TARGET')
});

const getS3Client = ({
                       awsAccessKeyId,
                       awsSecretAccessKey,
                       awsRegion
                     }: InputParameters) => {
  return s3.createClient({
    s3Options: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
      region: awsRegion
    }
  });
};

const printProgress = ({ progressAmount, progressTotal }) =>
  console.log('Progress:', progressAmount, progressTotal);

const syncFolder = (inputParameters: InputParameters) => {
  const { source, withDelete, awsBucketName, target } = inputParameters;

  return new Promise((resolve, reject) => {
    const uploader = getS3Client(inputParameters);
    uploader.uploadDir({
      localDir: source,
      deleteRemoved: withDelete,
      s3Params: { Bucket: awsBucketName, Prefix: target }
    });
    uploader.on('error', (err) => reject(err));
    uploader.on('progress', () => printProgress(uploader));
    uploader.on('end', () => resolve());
  });
};

async function run(): Promise<void> {
  try {
    const inputParameters = getInputParameters();
    await syncFolder(inputParameters);
  } catch (error) {
    setFailed(error.message);
  }
}

run();
