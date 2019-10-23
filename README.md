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

*Note: I don't completely understand the example in the [Safe Lambda deployments](https://github.com/awslabs/serverless-application-model/blob/master/docs/safe_lambda_deployments.rst#traffic-shifting-using-codedeploy) doc*

```yaml
# Why do we monitor both the alias and new version?
AliasErrorMetricGreaterThanZeroAlarm:
  Type: "AWS::CloudWatch::Alarm"
  Properties:
    AlarmDescription: Lambda Function Error > 0
    ComparisonOperator: GreaterThanThreshold
    Dimensions:
      - Name: Resource
        Value: !Sub "${MyLambdaFunction}:live"
      - Name: FunctionName
        Value: !Ref MyLambdaFunction
    EvaluationPeriods: 2
    MetricName: Errors
    Namespace: AWS/Lambda
    Period: 60
    Statistic: Sum
    Threshold: 0
LatestVersionErrorMetricGreaterThanZeroAlarm:
  Type: "AWS::CloudWatch::Alarm"
  Properties:
    AlarmDescription: Lambda Function Error > 0
    ComparisonOperator: GreaterThanThreshold
    Dimensions:
      - Name: Resource
        Value: !Sub "${MyLambdaFunction}:live"
      - Name: FunctionName
        Value: !Ref MyLambdaFunction
      - Name: ExecutedVersion
        Value: !GetAtt MyLambdaFunction.Version.Version
    EvaluationPeriods: 2
    MetricName: Errors
    Namespace: AWS/Lambda
    Period: 60
    Statistic: Sum
    Threshold: 0
```

## Implementing in CDK

In CDK you can do the same thing. Define the following resources:

* **S3 Asset** to upload lambda code bundle to S3 and to detect when there are changes (via `sourceHash`)
* **Lambda Function** that uses the code bundle deployed to S3
* **Lambda Version** that changes whenever the code changes (using `sourceHash`)
* **Lambda Alias** required for blue/green deployments
* **CodeBuild Deployment Group** to manage the blue/green deployments (using the alias)

```typescript
const lambdaCode = new Asset(this, 'LambdaCode', {
  path: path.join(__dirname, 'path/to/lambda/code')
});

const lambdaFunction = new Function(this, 'LambdaFunction', {
  code: Code.fromBucket(lambdaCode.bucket, lambdaCode.s3ObjectKey),
  // more lambda function props ...
});

const lambdaVersion = lambdaFunction.addVersion(lambdaCode.sourceHash);

const lambdaVersionAlias = new Alias(this, 'LambdaVersionAlias', {
  aliasName: 'live',
  version: lambdaVersion
});

const lambdaApplication = new LambdaApplication(this, 'LambdaApplication');

new LambdaDeploymentGroup(this, 'LambdaDeploymentGroup', {
  application: lambdaApplication,
  alias: lambdaVersionAlias,
  deploymentConfig: LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES
});
```

Just be sure to reference the alias in your API Gateway Lambda Proxy Integrations:

```typescript
const restApi = new RestApi(this, 'RestApi');

restApi.root.addMethod('GET', new LambdaIntegration(lambdaVersionAlias));
```

You can deploy the CDK stack with the following command:

```bash
# if you haven't installed the dependencies, do that with npm
npm install 

# deploy with CDK
npm run cdk -- --app 'npx ts-node ./cdk_example/contacts_api_app.ts' deploy
```

## Alternative Strategies

Using API Gateway Canary settings and doing blue/green rollout of the entire REST API. The lambda integrations could point directly to a new lambda version instead of using an alias.

Pros:
  * Less compatibility issues when making API + Lambda changes in a single deployment

Cons:
  * No existing automation like CodeDeploy to support an API Gateway canary deployment

# TODO

- [x] Rollout specifics (order of operations)
- [x] Integration test examples
- [x] End-to-end test examples
- [x] Rollback specifics
- [x] Alarms
- [x] Cause a rollback by triggering an alarm
- [x] Clean up CDK policies
- [ ] Deploy all the stacks and review the stack names
- [ ] Debug test examples
