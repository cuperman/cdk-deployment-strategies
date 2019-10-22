#!/usr/bin/env node
import 'source-map-support/register';
import path = require('path');
import { Stack, Construct, StackProps, App } from '@aws-cdk/core';
import { Table, AttributeType, BillingMode } from '@aws-cdk/aws-dynamodb';
import { Asset } from '@aws-cdk/aws-s3-assets';
import { Function, Runtime, Code, Alias, FunctionProps } from '@aws-cdk/aws-lambda';
import { RestApi, LambdaIntegration } from '@aws-cdk/aws-apigateway';
import { LambdaApplication, LambdaDeploymentGroup, LambdaDeploymentConfig, ILambdaDeploymentConfig, LambdaApplicationProps } from '@aws-cdk/aws-codedeploy';

interface VersionedFunctionProps extends FunctionProps {
  readonly versionName: string;
}

interface CanaryFunctionProps extends VersionedFunctionProps {
  readonly aliasName: string;
  readonly lambdaApplication: LambdaApplication;
  readonly deploymentConfig: ILambdaDeploymentConfig;
}

class CanaryFunction extends Function {
  public readonly canaryAlias: Alias;
  public readonly canaryDeploymentGroup: LambdaDeploymentGroup;

  constructor(scope: Construct, id: string, props: CanaryFunctionProps) {
    super(scope, id, props);

    const { versionName, aliasName, lambdaApplication, deploymentConfig } = props;

    const lambdaFunctionVersion = this.addVersion(versionName);
    
    this.canaryAlias = new Alias(this, 'Alias', {
      aliasName,
      version: lambdaFunctionVersion
    });

    this.canaryDeploymentGroup = new LambdaDeploymentGroup(this, 'DeploymentGroup', {
      application: lambdaApplication,
      alias: this.canaryAlias,
      deploymentConfig
    });
  }
}

interface CanaryDeploymentGroupProps extends LambdaApplicationProps {
  readonly canaryAliasName: string;
  readonly canaryDeploymentConfig: ILambdaDeploymentConfig;
}

class CanaryDeploymentGroup extends LambdaApplication {
  public readonly canaryAliasName: string;
  public readonly canaryDeploymentConfig: ILambdaDeploymentConfig;

  constructor(scope: Construct, id: string, props: CanaryDeploymentGroupProps) {
    super(scope, id, props);

    this.canaryAliasName = props.canaryAliasName;
    this.canaryDeploymentConfig = props.canaryDeploymentConfig;
  }

  addCanaryFunction(id: string, props: VersionedFunctionProps) {
    const canaryFunctionProps = Object.assign({}, props, {
      aliasName: this.canaryAliasName,
      lambdaApplication: this,
      deploymentConfig: this.canaryDeploymentConfig
    });
    return new CanaryFunction(this, id, canaryFunctionProps);
  }
}

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

    const canaryDeploymentGroup = new CanaryDeploymentGroup(this, 'ContactsCanaryFunctionGroup', {
      canaryAliasName: 'live',
      canaryDeploymentConfig: LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES
    });

    const listContacts = canaryDeploymentGroup.addCanaryFunction('ListContacts', {
      runtime: Runtime.NODEJS_10_X,
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

const app = new App();
new ContactsApiStack(app, 'ContactsApiCdk');
