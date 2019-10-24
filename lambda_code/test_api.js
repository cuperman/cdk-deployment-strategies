const AWS = require('aws-sdk');
const fetch = require('node-fetch');

const STATUS_SUCCEEDED = 'Succeeded';
const STATUS_FAILED = 'Failed';

const REST_API_URL = process.env.REST_API_URL;

exports.testGetContacts = async event => {
  const deploymentId = event.DeploymentId;
  const lifecycleEventHookExecutionId = event.LifecycleEventHookExecutionId;

  const codedeploy = new AWS.CodeDeploy({ apiVersion: '2014-10-06' });

  try {
    const response = await fetch(`${REST_API_URL}/contacts`);
    const json = await response.json();

    // it should have data
    if (!json.data) {
      throw new Error(`No data present in body`);
    }

    // it should have metadata
    if (!json.metadata) {
      throw new Error(`No metadata present in body`);
    }

    // data object should be an array
    if (!Array.isArray(json.data)) {
      throw new Error(`Data is not an array`);
    }
  } catch (error) {
    console.error(error);
    return codedeploy
      .putLifecycleEventHookExecutionStatus({
        status: STATUS_FAILED,
        deploymentId,
        lifecycleEventHookExecutionId
      })
      .promise();
  }

  // if you made it here, everything was successful!
  return codedeploy
    .putLifecycleEventHookExecutionStatus({
      status: STATUS_SUCCEEDED,
      deploymentId,
      lifecycleEventHookExecutionId
    })
    .promise();
};
