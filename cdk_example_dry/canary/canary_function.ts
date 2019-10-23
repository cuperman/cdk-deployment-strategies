import { Construct } from '@aws-cdk/core';
import { Function, Alias, FunctionProps } from '@aws-cdk/aws-lambda';
import {
  LambdaApplication,
  LambdaDeploymentGroup,
  ILambdaDeploymentConfig
} from '@aws-cdk/aws-codedeploy';

export interface VersionedFunctionProps extends FunctionProps {
  readonly versionName: string;
}

export interface CanaryFunctionProps extends VersionedFunctionProps {
  readonly aliasName: string;
  readonly lambdaApplication: LambdaApplication;
  readonly deploymentConfig: ILambdaDeploymentConfig;
}

export class CanaryFunction extends Function {
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
