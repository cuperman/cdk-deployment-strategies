# CloudFormation Deployment Strategies

## Lambda Versioning

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
