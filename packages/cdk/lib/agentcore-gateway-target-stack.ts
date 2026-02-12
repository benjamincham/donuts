import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as agentcore from '@aws-cdk/aws-bedrock-agentcore-alpha';
import { Construct } from 'constructs';
import { AgentCoreLambdaTarget } from './constructs/agentcore';
import { EnvironmentConfig } from '../config';

/**
 * Target definition for Lambda-based Gateway targets
 */
export interface LambdaTargetDefinition {
  /**
   * Target name
   */
  readonly targetName: string;

  /**
   * Target description (optional)
   */
  readonly description?: string;

  /**
   * Lambda function source code directory
   * Relative path (from project root)
   */
  readonly lambdaCodePath: string;

  /**
   * Tool Schema file path
   * Relative path (from project root)
   */
  readonly toolSchemaPath: string;

  /**
   * Lambda timeout duration in seconds (optional)
   * @default 30
   */
  readonly timeout?: number;

  /**
   * Lambda memory size in MB (optional)
   * @default 256
   */
  readonly memorySize?: number;

  /**
   * Environment variables (optional)
   */
  readonly environment?: { [key: string]: string };

  /**
   * Whether to grant Retrieve permission to Knowledge Base (optional)
   * @default false
   */
  readonly enableKnowledgeBaseAccess?: boolean;
}

export interface AgentCoreGatewayTargetStackProps extends cdk.StackProps {
  /**
   * Environment configuration
   */
  readonly envConfig: EnvironmentConfig;

  /**
   * Gateway ARN (direct specification)
   * Takes precedence over coreStackName import.
   */
  readonly gatewayArn?: string;

  /**
   * Gateway ID (required when gatewayArn is specified)
   */
  readonly gatewayId?: string;

  /**
   * Gateway Name (required when gatewayArn is specified)
   */
  readonly gatewayName?: string;

  /**
   * Gateway Role ARN (required when gatewayArn is specified)
   */
  readonly gatewayRoleArn?: string;

  /**
   * AgentCoreStack name to import Gateway attributes from via Fn::ImportValue
   * Used when gatewayArn is not directly specified.
   */
  readonly coreStackName?: string;
}

/**
 * AgentCore Gateway Target Stack
 *
 * Independently deployable stack for managing Gateway targets (Lambda Tools, etc.).
 *
 * This stack is separated from the core AgentCoreStack to split the deployment unit,
 * enabling each target to be added, updated, or removed independently without
 * affecting core infrastructure (Gateway, Cognito, Runtime, Storage, etc.).
 *
 * Gateway connection methods:
 * - coreStackName: Cross-stack reference via Fn::ImportValue (same account/region)
 * - Direct attributes (gatewayArn, gatewayId, etc.): Connect to externally managed Gateways
 */
export class AgentCoreGatewayTargetStack extends cdk.Stack {
  /**
   * Built-in target definitions managed within this stack.
   * Add new targets here to deploy them as part of this stack.
   */
  private static readonly BUILT_IN_TARGETS: LambdaTargetDefinition[] = [
    {
      targetName: 'utility-tools',
      description: 'Lambda function providing utility tools',
      lambdaCodePath: 'packages/lambda-tools/tools/utility-tools',
      toolSchemaPath: 'packages/lambda-tools/tools/utility-tools/tool-schema.json',
      timeout: 30,
      memorySize: 256,
      enableKnowledgeBaseAccess: true,
      environment: {
        LOG_LEVEL: 'INFO',
      },
    },
  ];

  /**
   * Created Lambda targets
   */
  public readonly lambdaTargets: AgentCoreLambdaTarget[] = [];

  constructor(scope: Construct, id: string, props: AgentCoreGatewayTargetStackProps) {
    super(scope, id, props);

    const envConfig = props.envConfig;
    const resourcePrefix = envConfig.resourcePrefix;

    // Resolve Gateway attributes (direct specification or cross-stack import)
    const gatewayArn = props.gatewayArn || this.importValue(props.coreStackName, 'GatewayArn');
    const gatewayId = props.gatewayId || this.importValue(props.coreStackName, 'GatewayId');
    const gatewayName = props.gatewayName || this.importValue(props.coreStackName, 'GatewayName');
    const gatewayRoleArn =
      props.gatewayRoleArn || this.importValue(props.coreStackName, 'GatewayRoleArn');

    // Import Gateway using L2 fromGatewayAttributes
    const importedGateway = agentcore.Gateway.fromGatewayAttributes(this, 'ImportedGateway', {
      gatewayArn,
      gatewayId,
      gatewayName,
      role: iam.Role.fromRoleArn(this, 'ImportedGatewayRole', gatewayRoleArn),
    });

    // Create Lambda targets from built-in definitions
    const targets = AgentCoreGatewayTargetStack.BUILT_IN_TARGETS;
    for (const targetDef of targets) {
      const target = new AgentCoreLambdaTarget(this, `Target-${targetDef.targetName}`, {
        resourcePrefix,
        targetName: targetDef.targetName,
        description: targetDef.description,
        lambdaCodePath: targetDef.lambdaCodePath,
        toolSchemaPath: targetDef.toolSchemaPath,
        timeout: targetDef.timeout,
        memorySize: targetDef.memorySize,
        environment: targetDef.environment,
        enableKnowledgeBaseAccess: targetDef.enableKnowledgeBaseAccess,
      });

      // Add target to the imported Gateway
      target.addToImportedGateway(importedGateway, `GatewayTarget-${targetDef.targetName}`);

      this.lambdaTargets.push(target);

      // CloudFormation outputs per target
      new cdk.CfnOutput(this, `${targetDef.targetName}-LambdaArn`, {
        value: target.lambdaFunction.functionArn,
        description: `${targetDef.targetName} Lambda Function ARN`,
      });

      new cdk.CfnOutput(this, `${targetDef.targetName}-LambdaName`, {
        value: target.lambdaFunction.functionName,
        description: `${targetDef.targetName} Lambda Function Name`,
      });
    }

    // Stack-level outputs
    new cdk.CfnOutput(this, 'GatewayArn', {
      value: gatewayArn,
      description: 'Connected AgentCore Gateway ARN',
    });

    new cdk.CfnOutput(this, 'TargetCount', {
      value: String(targets.length),
      description: 'Number of deployed Gateway targets',
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'AgentCore');
    cdk.Tags.of(this).add('Component', 'GatewayTargets');
  }

  /**
   * Import a value from another stack's CfnOutput exports
   */
  private importValue(coreStackName: string | undefined, outputKey: string): string {
    if (!coreStackName) {
      throw new Error(
        `Either direct Gateway attributes or coreStackName must be provided. Missing value for: ${outputKey}`
      );
    }
    return cdk.Fn.importValue(`${coreStackName}-${outputKey}`);
  }
}
