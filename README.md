  # CloudFormation Deployment Strategies

## What does SAM do?

SAM uses lambda aliases and CodeDeploy to roll out changes to lambda functions, which can be rolled back on test failures or cloudwatch alarms.

Take a look at [Safe Lambda deployments](https://github.com/awslabs/serverless-application-model/blob/master/docs/safe_lambda_deployments.rst).

## CDK Equivalent

```bash
aws cloudformation package \
  --template-file ./examples/sam-contacts.yml \
  --output-template-file ./sam-contacts-out.yml \
  --s3-bucket jeffws-templates \
  --profile jeff

aws cloudformation deploy \
  --template-file ./sam-contacts-out.yml \
  --stack-name SamContacts \
  --capabilities CAPABILITY_IAM \
  --profile jeff
```

## New Concepts

* Locking API Gateway lambda integrations to a specific version of a lambda function, and using the stage/deployment canary settings to roll out the API & lambda changes together.

### Lambda Versioning

Create a lambda function and a new version whenever the code changes. If the code is the same, the source hash will be the same, and the asset will not be uploaded. The removal policy prevents old versions from being deleted when the code changes.

```typescript
const myAsset = new Asset(this, 'MyAsset', {
  path: path.join(__dirname, '../lambda')
});

const myFunction = new Function(this, 'MyFunction', {
  runtime: Runtime.NODEJS_10_X,
  code: Code.fromBucket(myAsset.bucket, myAsset.s3ObjectKey),
  handler: 'hello.handler'
});

const myVersion = myFunction.addVersion(myAsset.sourceHash);
(
  myVersion.node.findChild('Resource') as CfnVersion
).applyRemovalPolicy(RemovalPolicy.RETAIN);
```

*Note: If only the function properties change, then the latest version does not get updated.  Need to investigate if aliases solve this problem, or if the properties hash should be included in the version name.*

See [my-stack.yml](./cfn/my-stack.yml)

Run it: `cdk --profile jeff --app 'npx ts-node ./examples/my-stack.ts' deploy`
