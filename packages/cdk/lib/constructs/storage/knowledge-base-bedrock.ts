/**
 * Bedrock Knowledge Base Construct
 * Provides Bedrock Knowledge Base for RAG capabilities
 */

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import { Construct } from 'constructs';

export interface KnowledgeBaseBedrockProps {
  /**
   * Knowledge Base name prefix
   */
  readonly knowledgeBaseNamePrefix: string;

  /**
   * Knowledge Base description
   */
  readonly description?: string;

  /**
   * S3 bucket ARN for data source
   */
  readonly dataSourceBucketArn: string;

  /**
   * OpenSearch collection ARN
   */
  readonly opensearchCollectionArn: string;

  /**
   * OpenSearch index name
   * @default 'bedrock-knowledge-base-index'
   */
  readonly opensearchIndexName?: string;

  /**
   * Vector field name in OpenSearch
   * @default 'bedrock-knowledge-base-default-vector'
   */
  readonly vectorFieldName?: string;

  /**
   * Text field name in OpenSearch
   * @default 'AMAZON_BEDROCK_TEXT_CHUNK'
   */
  readonly textFieldName?: string;

  /**
   * Metadata field name in OpenSearch
   * @default 'AMAZON_BEDROCK_METADATA'
   */
  readonly metadataFieldName?: string;

  /**
   * Embedding model ARN
   * @default Amazon Titan Embeddings G1 - Text
   */
  readonly embeddingModelArn?: string;
}

/**
 * Bedrock Knowledge Base Construct
 * Provides Bedrock Knowledge Base with OpenSearch vector store
 */
export class KnowledgeBaseBedrock extends Construct {
  /**
   * Bedrock Knowledge Base
   */
  public readonly knowledgeBase: bedrock.CfnKnowledgeBase;

  /**
   * Knowledge Base ID
   */
  public readonly knowledgeBaseId: string;

  /**
   * Knowledge Base ARN
   */
  public readonly knowledgeBaseArn: string;

  /**
   * Knowledge Base name
   */
  public readonly knowledgeBaseName: string;

  /**
   * Data Source
   */
  public readonly dataSource: bedrock.CfnDataSource;

  /**
   * Data Source ID
   */
  public readonly dataSourceId: string;

  /**
   * IAM role for Bedrock Knowledge Base
   */
  public readonly knowledgeBaseRole: iam.Role;

  constructor(scope: Construct, id: string, props: KnowledgeBaseBedrockProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);
    const knowledgeBaseName = `${props.knowledgeBaseNamePrefix}-kb`;

    // Create IAM role for Knowledge Base
    this.knowledgeBaseRole = new iam.Role(this, 'KnowledgeBaseRole', {
      roleName: `${knowledgeBaseName}-role`,
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      description: 'IAM role for Bedrock Knowledge Base',
    });

    // Add policy for OpenSearch access
    this.knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'aoss:APIAccessAll',
        ],
        resources: [props.opensearchCollectionArn],
      })
    );

    // Add policy for S3 access
    this.knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:ListBucket',
        ],
        resources: [
          props.dataSourceBucketArn,
          `${props.dataSourceBucketArn}/*`,
        ],
      })
    );

    // Add policy for Bedrock model invocation
    this.knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
        ],
        resources: [
          props.embeddingModelArn ||
            `arn:aws:bedrock:${stack.region}::foundation-model/amazon.titan-embed-text-v1`,
        ],
      })
    );

    // Create Knowledge Base
    this.knowledgeBase = new bedrock.CfnKnowledgeBase(this, 'KnowledgeBase', {
      name: knowledgeBaseName,
      description: props.description || 'Bedrock Knowledge Base for RAG',
      roleArn: this.knowledgeBaseRole.roleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn:
            props.embeddingModelArn ||
            `arn:aws:bedrock:${stack.region}::foundation-model/amazon.titan-embed-text-v1`,
        },
      },
      storageConfiguration: {
        type: 'OPENSEARCH_SERVERLESS',
        opensearchServerlessConfiguration: {
          collectionArn: props.opensearchCollectionArn,
          vectorIndexName: props.opensearchIndexName || 'bedrock-knowledge-base-index',
          fieldMapping: {
            vectorField: props.vectorFieldName || 'bedrock-knowledge-base-default-vector',
            textField: props.textFieldName || 'AMAZON_BEDROCK_TEXT_CHUNK',
            metadataField: props.metadataFieldName || 'AMAZON_BEDROCK_METADATA',
          },
        },
      },
    });

    this.knowledgeBaseId = this.knowledgeBase.attrKnowledgeBaseId;
    this.knowledgeBaseArn = this.knowledgeBase.attrKnowledgeBaseArn;
    this.knowledgeBaseName = this.knowledgeBase.name;

    // Create Data Source
    // Note: No inclusionPrefixes specified to allow dynamic kb-{knowledgeBaseId} prefixes
    // Backend creates KBs with prefixes like "kb-{uuid}/" which are picked up by the data source
    this.dataSource = new bedrock.CfnDataSource(this, 'DataSource', {
      name: `${knowledgeBaseName}-data-source`,
      description: 'S3 data source for Knowledge Base',
      knowledgeBaseId: this.knowledgeBaseId,
      dataSourceConfiguration: {
        type: 'S3',
        s3Configuration: {
          bucketArn: props.dataSourceBucketArn,
          // No inclusionPrefixes - scans entire bucket for all kb-* prefixes
        },
      },
      vectorIngestionConfiguration: {
        chunkingConfiguration: {
          chunkingStrategy: 'FIXED_SIZE',
          fixedSizeChunkingConfiguration: {
            maxTokens: 300,
            overlapPercentage: 20,
          },
        },
      },
    });

    this.dataSourceId = this.dataSource.attrDataSourceId;

    // Add tags
    cdk.Tags.of(this.knowledgeBase).add('Component', 'BedrockKnowledgeBase');
    cdk.Tags.of(this.knowledgeBase).add('Purpose', 'RAG');
  }

  /**
   * Grant access to invoke the Knowledge Base
   */
  public grantInvoke(grantee: iam.IGrantable): void {
    grantee.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:Retrieve',
          'bedrock:RetrieveAndGenerate',
        ],
        resources: [this.knowledgeBaseArn],
      })
    );
  }

  /**
   * Grant admin access to manage the Knowledge Base
   */
  public grantAdmin(grantee: iam.IGrantable): void {
    grantee.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:CreateKnowledgeBase',
          'bedrock:UpdateKnowledgeBase',
          'bedrock:DeleteKnowledgeBase',
          'bedrock:GetKnowledgeBase',
          'bedrock:ListKnowledgeBases',
          'bedrock:CreateDataSource',
          'bedrock:UpdateDataSource',
          'bedrock:DeleteDataSource',
          'bedrock:GetDataSource',
          'bedrock:ListDataSources',
          'bedrock:StartIngestionJob',
          'bedrock:GetIngestionJob',
          'bedrock:ListIngestionJobs',
        ],
        resources: [this.knowledgeBaseArn],
      })
    );
  }
}
