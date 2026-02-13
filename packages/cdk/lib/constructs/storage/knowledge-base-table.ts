/**
 * Knowledge Base Table Construct
 * DynamoDB table for storing user knowledge bases
 */

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface KnowledgeBaseTableProps {
  /**
   * Table name prefix
   */
  readonly tableNamePrefix: string;

  /**
   * Removal policy for the table (default: RETAIN)
   */
  readonly removalPolicy?: cdk.RemovalPolicy;

  /**
   * Point-in-time recovery enabled (default: true)
   */
  readonly pointInTimeRecovery?: boolean;
}

/**
 * DynamoDB table for storing user knowledge bases
 */
export class KnowledgeBaseTable extends Construct {
  /**
   * The DynamoDB table
   */
  public readonly table: dynamodb.Table;

  /**
   * The table name
   */
  public readonly tableName: string;

  /**
   * The table ARN
   */
  public readonly tableArn: string;

  constructor(scope: Construct, id: string, props: KnowledgeBaseTableProps) {
    super(scope, id);

    // Create DynamoDB table for knowledge bases
    this.table = new dynamodb.Table(this, 'Table', {
      tableName: `${props.tableNamePrefix}-knowledge-bases`,
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'knowledgeBaseId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.removalPolicy || cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: props.pointInTimeRecovery ?? true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Add GSI for querying by status
    this.table.addGlobalSecondaryIndex({
      indexName: 'status-createdAt-index',
      partitionKey: {
        name: 'status',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.tableName = this.table.tableName;
    this.tableArn = this.table.tableArn;

    // Add tags
    cdk.Tags.of(this.table).add('Component', 'KnowledgeBase');
    cdk.Tags.of(this.table).add('Purpose', 'UserKnowledgeBaseStorage');
  }

  /**
   * Grant read permissions to a principal
   */
  public grantRead(grantee: cdk.aws_iam.IGrantable): void {
    this.table.grantReadData(grantee);
  }

  /**
   * Grant write permissions to a principal
   */
  public grantWrite(grantee: cdk.aws_iam.IGrantable): void {
    this.table.grantWriteData(grantee);
  }

  /**
   * Grant read/write permissions to a principal
   */
  public grantReadWrite(grantee: cdk.aws_iam.IGrantable): void {
    this.table.grantReadWriteData(grantee);
  }
}
