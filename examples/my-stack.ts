#!/usr/bin/env node
import 'source-map-support/register';
import path = require('path');
import { Stack, Construct, StackProps, App, RemovalPolicy } from '@aws-cdk/core';
import { Asset } from '@aws-cdk/aws-s3-assets';
import { Function, Runtime, Code, CfnVersion } from '@aws-cdk/aws-lambda';

/*
 * Does something
 */
class MyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const myAsset = new Asset(this, 'MyAsset', {
      path: path.join(__dirname, '../lambda')
    });

    const myFunction = new Function(this, 'MyFunction', {
      runtime: Runtime.NODEJS_10_X,
      code: Code.fromBucket(myAsset.bucket, myAsset.s3ObjectKey),
      handler: 'hello.handler'
    });

    const myVersion = myFunction.addVersion(myAsset.sourceHash);
    (myVersion.node.findChild('Resource') as CfnVersion).applyRemovalPolicy(RemovalPolicy.RETAIN);
  }
}

const app = new App();
new MyStack(app, 'MyApp');
