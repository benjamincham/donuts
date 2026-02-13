/**
 * Knowledge Base OpenSearch Construct
 * Provides OpenSearch Serverless collection for vector search
 */

import * as cdk from 'aws-cdk-lib';
import * as opensearch from 'aws-cdk-lib/aws-opensearchserverless';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface KnowledgeBaseOpenSearchProps {
  /**
   * Collection name prefix
   */
  readonly collectionNamePrefix: string;

  /**
   * Description for the collection
   */
  readonly description?: string;
}

/**
 * Knowledge Base OpenSearch Construct
 * Provides OpenSearch Serverless collection for Bedrock Knowledge Base vector search
 */
export class KnowledgeBaseOpenSearch extends Construct {
  /**
   * OpenSearch Serverless collection
   */
  public readonly collection: opensearch.CfnCollection;

  /**
   * Collection name
   */
  public readonly collectionName: string;

  /**
   * Collection ARN
   */
  public readonly collectionArn: string;

  /**
   * Collection endpoint
   */
  public readonly collectionEndpoint: string;

  constructor(scope: Construct, id: string, props: KnowledgeBaseOpenSearchProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);
    const collectionName = `${props.collectionNamePrefix}-kb-collection`;

    // Create encryption policy
    const encryptionPolicy = new opensearch.CfnSecurityPolicy(this, 'EncryptionPolicy', {
      name: `${props.collectionNamePrefix}-kb-encryption-policy`,
      type: 'encryption',
      description: 'Encryption policy for Knowledge Base OpenSearch collection',
      policy: JSON.stringify({
        Rules: [
          {
            ResourceType: 'collection',
            Resource: [`collection/${collectionName}`],
          },
        ],
        AWSOwnedKey: true,
      }),
    });

    // Create network policy - VPC only access
    const networkPolicy = new opensearch.CfnSecurityPolicy(this, 'NetworkPolicy', {
      name: `${props.collectionNamePrefix}-kb-network-policy`,
      type: 'network',
      description: 'Network policy for Knowledge Base OpenSearch collection (VPC only)',
      policy: JSON.stringify([
        {
          Rules: [
            {
              ResourceType: 'collection',
              Resource: [`collection/${collectionName}`],
            },
            {
              ResourceType: 'dashboard',
              Resource: [`collection/${collectionName}`],
            },
          ],
          AllowFromPublic: false,
        },
      ]),
    });

    // Create access policy for Bedrock service
    const accessPolicy = new opensearch.CfnAccessPolicy(this, 'AccessPolicy', {
      name: `${props.collectionNamePrefix}-kb-access-policy`,
      type: 'data',
      description: 'Access policy for Bedrock Knowledge Base',
      policy: JSON.stringify([
        {
          Rules: [
            {
              ResourceType: 'index',
              Resource: [`index/${collectionName}/*`],
              Permission: [
                'aoss:CreateIndex',
                'aoss:DeleteIndex',
                'aoss:UpdateIndex',
                'aoss:DescribeIndex',
                'aoss:ReadDocument',
                'aoss:WriteDocument',
              ],
            },
            {
              ResourceType: 'collection',
              Resource: [`collection/${collectionName}`],
              Permission: [
                'aoss:DescribeCollectionItems',
                'aoss:CreateCollectionItems',
                'aoss:UpdateCollectionItems',
              ],
            },
          ],
          Principal: [
            `arn:aws:iam::${stack.account}:role/*`,
          ],
        },
      ]),
    });

    // Create OpenSearch Serverless collection
    this.collection = new opensearch.CfnCollection(this, 'Collection', {
      name: collectionName,
      description: props.description || 'OpenSearch Serverless collection for Bedrock Knowledge Base',
      type: 'VECTORSEARCH',
      standbyReplicas: 'DISABLED',
    });

    // Add dependencies
    this.collection.addDependency(encryptionPolicy);
    this.collection.addDependency(networkPolicy);
    this.collection.addDependency(accessPolicy);

    this.collectionName = this.collection.name;
    this.collectionArn = `arn:aws:aoss:${stack.region}:${stack.account}:collection/${this.collection.attrId}`;
    this.collectionEndpoint = `${this.collection.attrId}.${stack.region}.aoss.amazonaws.com`;

    // Add tags
    cdk.Tags.of(this.collection).add('Component', 'KnowledgeBaseOpenSearch');
    cdk.Tags.of(this.collection).add('Purpose', 'VectorSearch');
  }

  /**
   * Grant access to a principal
   */
  public grantAccess(grantee: iam.IGrantable): void {
    // Add IAM policy for OpenSearch Serverless access
    const policy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'aoss:APIAccessAll',
      ],
      resources: [this.collectionArn],
    });

    grantee.grantPrincipal.addToPrincipalPolicy(policy);
  }
}
