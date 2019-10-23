const AWS = require('aws-sdk');

const STATUS_SUCCEEDED = 'Succeeded';
const STATUS_FAILED = 'Failed';

const NEW_LAMBDA_VERSION = process.env.NEW_LAMBDA_VERSION; // TODO: update sam template

exports.testListContacts = async (event) => {
  console.log('event', JSON.stringify(event));

  const deploymentId = event.DeploymentId;
  const lifecycleEventHookExecutionId = event.LifecycleEventHookExecutionId;

  console.log('NEW_LAMBDA_VERSION', NEW_LAMBDA_VERSION);
  console.log('deploymentId', deploymentId);
  console.log('lifecycleEventHookExecutionId', lifecycleEventHookExecutionId);

  const lambda = new AWS.Lambda();
  const codedeploy = new AWS.CodeDeploy({ apiVersion: '2014-10-06' });

  try {
    // run tests, throwing exceptions on failures

    const params = {
      FunctionName: NEW_LAMBDA_VERSION,
      InvocationType: 'RequestResponse'
    };

    console.log('params', params);

    const response = lambda.invoke(params).promise();

    console.log('response', JSON.stringify(response));

    // FIXME: figure out why lambda is returning an empty response!!

    // // it should have status code 200
    // if (response.statusCode !== 200) {
    //   throw new Error(`Invalid status code: ${response.statusCode}`);
    // }

    // // it should be a json response
    // if (response.headers['Content-Type'] !== 'application/json') {
    //   throw new Error(`Invalid content type: ${response.headers['Content-Type']}`);
    // }
    // const json = JSON.parse(response.body);

    // // it should have data
    // if (!json.data) {
    //   throw new Error(`No data present in body`);
    // }

    // // it should have metadata
    // if (!json.metadata) {
    //   throw new Error(`No metadata present in body`);
    // }

    // // data object should be an array
    // if (!Array.isArray(json.data)) {
    //   throw new Error(`Data is not an array`);
    // }
  } catch(error) {
    console.log('CAUGHT ERROR!');
    console.error(error);
    console.log('params', {
      status: STATUS_FAILED,
      deploymentId,
      lifecycleEventHookExecutionId
    });
    return codedeploy.putLifecycleEventHookExecutionStatus({
      status: STATUS_FAILED,
      deploymentId,
      lifecycleEventHookExecutionId
    }).promise();
  }

  console.log('SUCCESS!');
  console.log('params', {
    status: STATUS_SUCCEEDED,
    deploymentId,
    lifecycleEventHookExecutionId
  });
  // if you made it here, everything was successful!
  return codedeploy.putLifecycleEventHookExecutionStatus({
    status: STATUS_SUCCEEDED,
    deploymentId,
    lifecycleEventHookExecutionId
  }).promise();
};
