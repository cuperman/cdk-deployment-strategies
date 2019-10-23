import path = require('path');
import { Stack, Construct, StackProps, Duration } from '@aws-cdk/core';
import { Table, AttributeType, BillingMode } from '@aws-cdk/aws-dynamodb';
import { Asset } from '@aws-cdk/aws-s3-assets';
import { Function, Runtime, Code, Alias } from '@aws-cdk/aws-lambda';
import { RestApi, LambdaIntegration } from '@aws-cdk/aws-apigateway';
import {
  LambdaApplication,
  LambdaDeploymentGroup,
  LambdaDeploymentConfig
} from '@aws-cdk/aws-codedeploy';
import { Alarm, ComparisonOperator } from '@aws-cdk/aws-cloudwatch';

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
      path: path.join(__dirname, '../lambda_code')
    });

    const listContacts = new Function(this, 'ListContacts', {
      runtime: Runtime.NODEJS_8_10,
      code: Code.fromBucket(contactsHandler.bucket, contactsHandler.s3ObjectKey),
      handler: 'crud.list',
      environment: {
        TABLE_NAME: contacts.tableName
      }
    });
    contacts.grantReadWriteData(listContacts);

    const listContactsLatestVersion = listContacts.addVersion(contactsHandler.sourceHash);

    const aliasName = 'live';
    const listContactsAliasLive = new Alias(this, 'ListContactsAliasLive', {
      aliasName,
      version: listContactsLatestVersion
    });

    // ALARMS

    const listContactsAlarm = new Alarm(this, 'ListContactsAlarm', {
      alarmDescription: 'Lambda Function Error > 0',
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      metric: listContactsLatestVersion.metricErrors({
        dimensions: {
          Resource: `${listContacts.functionName}:${aliasName}`,
          FunctionName: listContacts.functionName,
          ExecutedVersion: listContactsLatestVersion.version
        },
        period: Duration.minutes(1),
        statistic: 'Sum'
      }),
      evaluationPeriods: 2,
      threshold: 0
    });

    // TEST LAMBDAS

    const testListContactsLambda = new Function(this, 'TestListContactsLambda', {
      // use CodeDeployHook_ prefix to allow default CodeDeploy role to invoke functions
      // see Managed Policy: AWSCodeDeployRoleForLambda
      functionName: 'CodeDeployHook_TestListContactsLambda_CDK',
      runtime: Runtime.NODEJS_8_10,
      code: Code.fromBucket(contactsHandler.bucket, contactsHandler.s3ObjectKey),
      handler: 'test_lambda.testListContacts',
      environment: {
        NEW_LAMBDA_VERSION: listContactsLatestVersion.functionName
      }
    });
    listContacts.grantInvoke(testListContactsLambda);

    const testGetContactsApi = new Function(this, 'TestGetContactsApi', {
      // use CodeDeployHook_ prefix to allow default CodeDeploy role to invoke functions
      // see Managed Policy: AWSCodeDeployRoleForLambda
      functionName: 'CodeDeployHook_TestGetContactsApi_CDK',
      runtime: Runtime.NODEJS_8_10,
      code: Code.fromBucket(contactsHandler.bucket, contactsHandler.s3ObjectKey),
      handler: 'test_api.testGetContacts'
    });

    // LAMBDA DEPLOYMENT

    const contactsApplication = new LambdaApplication(this, 'ContactsApplication');

    const listContactsDeploymentGroup = new LambdaDeploymentGroup(this, 'ContactsDeploymentGroup', {
      application: contactsApplication,
      alias: listContactsAliasLive,
      deploymentConfig: LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
      alarms: [listContactsAlarm],
      preHook: testListContactsLambda,
      postHook: testGetContactsApi
    });

    listContactsDeploymentGroup.grantPutLifecycleEventHookExecutionStatus(testListContactsLambda);
    listContactsDeploymentGroup.grantPutLifecycleEventHookExecutionStatus(testGetContactsApi);

    // REST API

    const contactsApi = new RestApi(this, 'ContactsApiCdk');

    const contactsCollection = contactsApi.root.addResource('contacts');
    contactsCollection.addMethod('GET', new LambdaIntegration(listContactsAliasLive));
  }
}
