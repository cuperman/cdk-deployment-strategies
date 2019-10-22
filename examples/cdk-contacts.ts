#!/usr/bin/env node
import 'source-map-support/register';
import path = require('path');
import { Stack, Construct, StackProps, App } from '@aws-cdk/core';
import { Table, AttributeType, BillingMode } from '@aws-cdk/aws-dynamodb';
import { Asset } from '@aws-cdk/aws-s3-assets';
import { Function, Runtime, Code, Alias } from '@aws-cdk/aws-lambda';
import { RestApi, LambdaIntegration } from '@aws-cdk/aws-apigateway';
import { LambdaApplication, LambdaDeploymentGroup, LambdaDeploymentConfig } from '@aws-cdk/aws-codedeploy';

class ContactsApiStack extends Stack {
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

    const listContacts = new Function(this, 'ListContacts', {
      runtime: Runtime.NODEJS_10_X,
      code: Code.fromBucket(contactsHandler.bucket, contactsHandler.s3ObjectKey),
      handler: 'index.list',
      environment: {
        TABLE_NAME: contacts.tableName
      }
    });

    const listContactsLatestVersion = listContacts.addVersion(contactsHandler.sourceHash);
    const listContactsAliasLive = new Alias(this, 'ListContactsAliasLive', {
      aliasName: 'live',
      version: listContactsLatestVersion
    });

    // LAMBDA DEPLOYMENT

    const contactsApplication = new LambdaApplication(this, 'ContactsApplication');

    new LambdaDeploymentGroup(this, 'ContactsDeploymentGroup', {
      application: contactsApplication,
      alias: listContactsAliasLive,
      deploymentConfig: LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES
    });

    // REST API

    const contactsApi = new RestApi(this, 'ContactsApiCdk');
    
    const contactsCollection = contactsApi.root.addResource('contacts');
    contactsCollection.addMethod('GET', new LambdaIntegration(listContactsAliasLive));
  }
}

const app = new App();
new ContactsApiStack(app, 'ContactsApiCdk');
