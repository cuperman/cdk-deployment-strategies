import { Construct } from '@aws-cdk/core';
import {
  LambdaApplication,
  ILambdaDeploymentConfig,
  LambdaApplicationProps
} from '@aws-cdk/aws-codedeploy';

import { VersionedFunctionProps, CanaryFunction } from './canary_function';

export interface CanaryDeploymentGroupProps extends LambdaApplicationProps {
  readonly canaryAliasName: string;
  readonly canaryDeploymentConfig: ILambdaDeploymentConfig;
}

export class CanaryDeploymentGroup extends LambdaApplication {
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
