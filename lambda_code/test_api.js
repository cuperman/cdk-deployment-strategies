const AWS = require('aws-sdk');

const STATUS_SUCCEEDED = 'Succeeded';
const STATUS_FAILED = 'Failed';

exports.testGetContacts = async (event) => {
  const deploymentId = event.DeploymentId;
  const lifecycleEventHookExecutionId = event.LifecycleEventHookExecutionId;

  const codedeploy = new AWS.CodeDeploy({ apiVersion: '2014-10-06' });

  try {
    // run tests, throwing exceptions on failures

    // PUT TESTS HERE!

  } catch(error) {
    console.error(error);
    return codedeploy.putLifecycleEventHookExecutionStatus({
      status: STATUS_FAILED,
      deploymentId,
      lifecycleEventHookExecutionId
    }).promise();
  }

  // if you made it here, everything was successful!
  return codedeploy.putLifecycleEventHookExecutionStatus({
    status: STATUS_SUCCEEDED,
    deploymentId,
    lifecycleEventHookExecutionId
  }).promise();
};
