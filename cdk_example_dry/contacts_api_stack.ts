import path = require('path');
import { Stack, Construct, StackProps } from '@aws-cdk/core';
import { Table, AttributeType, BillingMode } from '@aws-cdk/aws-dynamodb';
import { Asset } from '@aws-cdk/aws-s3-assets';
import { Runtime, Code } from '@aws-cdk/aws-lambda';
import { RestApi, LambdaIntegration } from '@aws-cdk/aws-apigateway';
import { LambdaDeploymentConfig } from '@aws-cdk/aws-codedeploy';

import { CanaryDeploymentGroup } from './canary/canary_deployment_group';

export class ContactsApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // TABLE

    const contacts = new Table(this, 'Contacts', {
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST
    });

    // LAMBDA

    const contactsHandler = new Asset(this, 'ContactsHandler', {
      path: path.join(__dirname, '../crud_code')
    });

    const canaryDeploymentGroup = new CanaryDeploymentGroup(this, 'ContactsCanaryFunctionGroup', {
      canaryAliasName: 'live',
      canaryDeploymentConfig: LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES
    });

    const listContacts = canaryDeploymentGroup.addCanaryFunction('ListContacts', {
      runtime: Runtime.NODEJS_8_10,
      code: Code.fromBucket(contactsHandler.bucket, contactsHandler.s3ObjectKey),
      handler: 'index.list',
      environment: {
        TABLE_NAME: contacts.tableName
      },
      versionName: contactsHandler.sourceHash
    });

    // REST API

    const contactsApi = new RestApi(this, 'ContactsApiCdk');

    const contactsCollection = contactsApi.root.addResource('contacts');
    contactsCollection.addMethod('GET', new LambdaIntegration(listContacts.canaryAlias));
  }
}
