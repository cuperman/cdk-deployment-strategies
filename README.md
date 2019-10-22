# CloudFormation Deployment Strategies

## Blue/Green vs Canary

[https://dev.to/mostlyjason/intro-to-deployment-strategies-blue-green-canary-and-more-3a3](https://dev.to/mostlyjason/intro-to-deployment-strategies-blue-green-canary-and-more-3a3)

## CodeDeploy

## What does SAM do?

SAM uses lambda aliases and CodeDeploy to roll out changes to lambda functions, which can be rolled back on test failures or cloudwatch alarms.

Take a look at [Safe Lambda deployments](https://github.com/awslabs/serverless-application-model/blob/master/docs/safe_lambda_deployments.rst).

```bash
aws cloudformation package \
  --template-file ./examples/sam-contacts.yml \
  --output-template-file ./sam.out/sam-contacts.yml \
  --s3-bucket jeffws-templates \
  --profile jeff

aws cloudformation deploy \
  --template-file ./sam.out/sam-contacts.yml \
  --stack-name ContactsApiSam \
  --capabilities CAPABILITY_IAM \
  --profile jeff
```

Or with change sets

```bash
aws cloudformation package \
  --template-file ./examples/sam-contacts.yml \
  --output-template-file ./sam.out/sam-contacts.yml \
  --s3-bucket jeffws-templates \
  --profile jeff

aws cloudformation create-change-set \
  --template-body file://sam.out/sam-contacts.yml \
  --stack-name ContactsApiSam \
  --change-set-name ContactsApiSam1 \
  --capabilities CAPABILITY_IAM \
  --profile jeff

aws cloudformation execute-change-set \
  --stack-name ContactsApiSam \
  --change-set-name ContactsApiSam1 \
  --profile jeff
```

### How does api key authentication work?

### How are versions managed??

## CDK Equivalent

Run it: `cdk --profile jeff --app 'npx ts-node ./examples/cdk-contacts.ts' deploy`

### Demo

* Updating the lambda code triggers a blue/green deploy
* Updating the stack without code changes returns quickly without blue/green deploy

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
