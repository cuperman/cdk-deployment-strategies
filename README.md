# Serverless Deployment Strategies

An exploration of AWS deployment strategies for serverless applications

## Questions

Some interesting questions on this topic:

* What are blue/green deployments?
* What are canary deployments?
* How do we detect deployment issues?
* How do we roll back if we find an issue?
* How the heck do we apply these strategies to serverless applications?

First let's do some reading. I found this article:

[https://dev.to/mostlyjason/intro-to-deployment-strategies-blue-green-canary-and-more-3a3](https://dev.to/mostlyjason/intro-to-deployment-strategies-blue-green-canary-and-more-3a3)

### What does SAM do?

SAM uses lambda aliases and CodeDeploy to roll out changes to lambda functions, which can be rolled back on test failures or cloudwatch alarms.

Take a look at [Safe Lambda deployments](https://github.com/awslabs/serverless-application-model/blob/master/docs/safe_lambda_deployments.rst).

Some questions I had about this strategy:

* How are changes to the entire stack rolled out if only the lambda functions use blue/green deployments?
* What happens if the lambda functions are rolled back, are the old lambda versions running within the new infrastructure?

Let's deploy a simple SAM application and find out:

```bash
aws cloudformation "package" \
  --template-file "./sam_example/contacts_api.yml" \
  --output-template-file "./sam.out/contacts_api.yml" \
  --s3-bucket "$TEMPLATE_BUCKET"

aws cloudformation "deploy" \
  --template-file "./sam.out/contacts_api.yml" \
  --stack-name "ContactsApiSam" \
  --capabilities "CAPABILITY_IAM"
```

Now make some changes to the entire stack, redeploy, and watch what happens:

```bash
aws cloudformation "package" \
  --template-file "./sam_example/contacts_api.yml" \
  --output-template-file "./sam.out/contacts_api.yml" \
  --s3-bucket "$TEMPLATE_BUCKET"

aws cloudformation "create-change-set" \
  --template-body "file://sam.out/contacts_api.yml" \
  --stack-name "ContactsApiSam" \
  --capabilities "CAPABILITY_IAM" \
  --change-set-name "ContactsApiSam-ChangeSet-1"

aws cloudformation "execute-change-set" \
  --stack-name "ContactsApiSam" \
  --change-set-name "ContactsApiSam-ChangeSet-1"
```

## Anwsers

Now we can answer some of our questions

### Blue/Green Deployments

Blue/green is a strategy to deploy your infrastructure and test it before toggling live traffic.

```yuml
// {type:class}
[Load balancer]->[Code version 1 {bg:blue}]
[Load balancer]-.->[Code version 2 {bg:darkgreen}]
```

### Canary

Canary is a strategy where you expose a percentage of your live traffic to new deployments to get feedback before full rollout.

```yuml
// {type:class}
[Load balancer]-90%>[Code version 1 {bg:blue}]
[Load balancer]-10%>[Code version 2 {bg:darkgreen}]
```

### Serverless Strategies

Imagine you have a a serverless application with an API Gateway, Lambda function backend, and DynamoDB tables. Deploying with CloudFormation and CodeDeploy will create a new undeployed API Gateway during the rollout, and use an alias to transition the traffic to the new lambda version.

*Pretty sure this is how it works, we should confirm*

```yuml
// {type:class}
[API Gateway deployment {bg:blue}]->[Lambda alias {bg:blue}]
[Lambda alias {bg:blue}]->[Lambda version {bg:blue}]
[Lambda version {bg:blue}]->[DynamoDB {bg:darkgreen}]

[undeployed API Gateway {bg:darkgreen}]->[Lambda alias {bg:blue}]
[Lambda alias {bg:blue}]->[Lambda new version {bg:darkgreen}]
[Lambda new version {bg:darkgreen}]->[DynamoDB {bg:darkgreen}]
```

### Detecting issues

The serverless deployment strategy above allows the following:

* New lambda function can be tested (integration tests)
* Live traffic can be moved to the new lambda version gradually (while monitoring for errors)
* New API gateway can be tested (end-to-end tests)

### Rolling back

The CloudFormation stack waits for the CodeDeploy Lambda deployment before deploying the API Gateway, so the change set can be reverted on any issues detected.

### CodeDeploy options

Traffic shifting configurations:

* Canary10Percent30Minutes
* Canary10Percent5Minutes
* Canary10Percent10Minutes
* Canary10Percent15Minutes
* AllAtOnce
* Linear10PercentEvery10Minutes
* Linear10PercentEvery1Minute
* Linear10PercentEvery2Minutes
* Linear10PercentEvery3Minutes

PreTraffic & PostTraffic Hooks:

* PreTraffic hook can run integration tests against your new Lambda version
* PostTraffic hook can run end-to-end tests against your new API Gateway deployment

CloudWatch Alarms can be used to detect errors while traffic is being shifted. You can use any CloudWatch metrics, like:

* API Gateway 4xx or 5xx errors, latency
* Lambda errors
* DynamoDB errors

## Implementing in CDK

# You are here

## NOTE TO SELF

- [ ] Integration test examples
- [ ] End-to-end test examples
- [ ] Alarms
- [ ] Deploy all the stacks and review the stack names
- [ ] Rollout specifics (order of operations)
- [ ] Rollback specifics

## CDK Equivalent

Run it: `cdk --profile jeff --app 'npx ts-node ./examples/cdk-contacts.ts' deploy`

**Show how many resources you need to create per route**

## Refactored CDK code

**Show how CDK code can be refactored to reduce boilerplate code**

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
