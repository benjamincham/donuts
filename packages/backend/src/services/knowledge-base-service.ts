/**
 * Knowledge Base Service
 * Manages Bedrock Knowledge Base operations with DynamoDB persistence
 */

import {
  BedrockAgentClient,
  CreateKnowledgeBaseCommand,
  DeleteKnowledgeBaseCommand,
  CreateDataSourceCommand,
  StartIngestionJobCommand,
  ListIngestionJobsCommand,
} from '@aws-sdk/client-bedrock-agent';
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  DeleteItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall, NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';

export interface KnowledgeBase {
  userId: string;
  knowledgeBaseId: string;
  name: string;
  description: string;
  bedrockKnowledgeBaseId?: string;
  bedrockDataSourceId?: string;
  s3BucketArn?: string;
  s3Prefix?: string;
  embeddingModelArn?: string;
  status: 'CREATING' | 'ACTIVE' | 'UPDATING' | 'DELETING' | 'FAILED' | 'PENDING';
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  syncStatus?: 'SYNCING' | 'SYNCED' | 'FAILED' | 'PENDING';
}

export interface CreateKnowledgeBaseInput {
  name: string;
  description: string;
  embeddingModelArn?: string;
}

export interface UpdateKnowledgeBaseInput extends Partial<CreateKnowledgeBaseInput> {
  knowledgeBaseId: string;
}

export interface KnowledgeBaseSyncResult {
  ingestionJobId: string;
  status: string;
}

/**
 * DynamoDB stored Knowledge Base type
 * status is stored as string for GSI compatibility
 */
interface DynamoKnowledgeBase extends Omit<KnowledgeBase, 'status' | 'syncStatus'> {
  status: string;
  syncStatus?: string;
}

function toDynamoKnowledgeBase(kb: KnowledgeBase): DynamoKnowledgeBase {
  return {
    ...kb,
    status: kb.status,
    syncStatus: kb.syncStatus,
  };
}

function fromDynamoKnowledgeBase(dynamoKb: DynamoKnowledgeBase): KnowledgeBase {
  return {
    ...dynamoKb,
    status: dynamoKb.status as KnowledgeBase['status'],
    syncStatus: dynamoKb.syncStatus as KnowledgeBase['syncStatus'],
  };
}

/**
 * Knowledge Base Service Class
 */
export class KnowledgeBaseService {
  private dynamoClient: DynamoDBClient;
  private bedrockClient: BedrockAgentClient;
  private tableName: string;
  private storageBucketName: string;
  private knowledgeBaseRoleArn: string;
  private s3VectorBucketName: string;

  constructor(
    tableName: string,
    storageBucketName: string,
    region?: string,
    knowledgeBaseRoleArn?: string,
    s3VectorBucketName?: string
  ) {
    this.tableName = tableName;
    this.storageBucketName = storageBucketName;
    const awsRegion = region || process.env.AWS_REGION || 'ap-southeast-1';
    this.knowledgeBaseRoleArn = knowledgeBaseRoleArn || process.env.KNOWLEDGE_BASE_ROLE_ARN || '';
    this.s3VectorBucketName = s3VectorBucketName || process.env.S3_VECTOR_BUCKET_NAME || '';
    this.dynamoClient = new DynamoDBClient({ region: awsRegion });
    this.bedrockClient = new BedrockAgentClient({ region: awsRegion });
  }

  /**
   * List user's knowledge bases
   */
  async listKnowledgeBases(userId: string): Promise<KnowledgeBase[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: marshall({
          ':userId': userId,
        }),
      });

      const response = await this.dynamoClient.send(command);

      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      return response.Items.map((item) =>
        fromDynamoKnowledgeBase(unmarshall(item) as DynamoKnowledgeBase)
      );
    } catch (error) {
      console.error('Error listing knowledge bases:', error);
      throw new Error('Failed to list knowledge bases');
    }
  }

  /**
   * Get a specific knowledge base
   */
  async getKnowledgeBase(userId: string, knowledgeBaseId: string): Promise<KnowledgeBase | null> {
    try {
      const command = new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({
          userId,
          knowledgeBaseId,
        }),
      });

      const response = await this.dynamoClient.send(command);

      if (!response.Item) {
        return null;
      }

      return fromDynamoKnowledgeBase(unmarshall(response.Item) as DynamoKnowledgeBase);
    } catch (error) {
      console.error('Error getting knowledge base:', error);
      throw new Error('Failed to get knowledge base');
    }
  }

  /**
   * Create a new knowledge base
   */
  async createKnowledgeBase(
    userId: string,
    input: CreateKnowledgeBaseInput
  ): Promise<KnowledgeBase> {
    try {
      const now = new Date().toISOString();
      const knowledgeBaseId = uuidv4();
      const region = process.env.AWS_REGION || 'ap-southeast-1';

      // Create S3 prefix for this knowledge base
      const s3Prefix = `kb-${knowledgeBaseId}`;
      const s3BucketArn = `arn:aws:s3:::${this.storageBucketName}`;

      // Validate required configuration
      if (!this.knowledgeBaseRoleArn) {
        throw new Error('KNOWLEDGE_BASE_ROLE_ARN environment variable is not set');
      }
      if (!this.s3VectorBucketName) {
        throw new Error('S3_VECTOR_BUCKET_NAME environment variable is not set');
      }

      const vectorIndexName = 'bedrock-kb-index';
      const accountId = process.env.AWS_ACCOUNT_ID || '*';

      // Create Bedrock Knowledge Base with S3 Vectors storage
      const createKbCommand = new CreateKnowledgeBaseCommand({
        name: `${input.name}-${knowledgeBaseId.slice(0, 8)}`,
        description: input.description,
        roleArn: this.knowledgeBaseRoleArn,
        knowledgeBaseConfiguration: {
          type: 'VECTOR',
          vectorKnowledgeBaseConfiguration: {
            embeddingModelArn:
              input.embeddingModelArn ||
              `arn:aws:bedrock:${region}::foundation-model/amazon.titan-embed-text-v1`,
          },
        },
        storageConfiguration: {
          type: 'S3_VECTORS',
          s3VectorsConfiguration: {
            indexArn: `arn:aws:s3vectors:${region}:${accountId}:bucket/${this.s3VectorBucketName}/index/${vectorIndexName}`,
            indexName: vectorIndexName,
            vectorBucketArn: `arn:aws:s3:::${this.s3VectorBucketName}`,
          },
        },
      });

      const kbResponse = await this.bedrockClient.send(createKbCommand);
      const bedrockKnowledgeBaseId = kbResponse.knowledgeBase?.knowledgeBaseId;

      if (!bedrockKnowledgeBaseId) {
        throw new Error('Failed to create Bedrock Knowledge Base');
      }

      // Create Data Source
      const createDsCommand = new CreateDataSourceCommand({
        knowledgeBaseId: bedrockKnowledgeBaseId,
        name: `${input.name}-data-source`,
        description: 'S3 data source for Knowledge Base',
        dataSourceConfiguration: {
          type: 'S3',
          s3Configuration: {
            bucketArn: s3BucketArn,
            inclusionPrefixes: [`${s3Prefix}/`],
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

      const dsResponse = await this.bedrockClient.send(createDsCommand);
      const bedrockDataSourceId = dsResponse.dataSource?.dataSourceId;

      // Create Knowledge Base record in DynamoDB
      const knowledgeBase: KnowledgeBase = {
        userId,
        knowledgeBaseId,
        name: input.name,
        description: input.description,
        bedrockKnowledgeBaseId,
        bedrockDataSourceId,
        s3BucketArn,
        s3Prefix,
        embeddingModelArn:
          input.embeddingModelArn ||
          `arn:aws:bedrock:${region}::foundation-model/amazon.titan-embed-text-v1`,
        status: 'CREATING',
        createdAt: now,
        updatedAt: now,
        syncStatus: 'PENDING',
      };

      const dynamoKb = toDynamoKnowledgeBase(knowledgeBase);

      const putCommand = new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(dynamoKb, { removeUndefinedValues: true }),
      });

      await this.dynamoClient.send(putCommand);

      return knowledgeBase;
    } catch (error) {
      console.error('Error creating knowledge base:', error);
      throw new Error('Failed to create knowledge base');
    }
  }

  /**
   * Update a knowledge base
   */
  async updateKnowledgeBase(
    userId: string,
    input: UpdateKnowledgeBaseInput
  ): Promise<KnowledgeBase> {
    try {
      // Get existing knowledge base
      const existingKb = await this.getKnowledgeBase(userId, input.knowledgeBaseId);

      if (!existingKb) {
        throw new Error('Knowledge base not found');
      }

      const now = new Date().toISOString();

      // Build update expression
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, NativeAttributeValue> = {};

      if (input.name !== undefined) {
        updateExpressions.push('#name = :name');
        expressionAttributeNames['#name'] = 'name';
        expressionAttributeValues[':name'] = input.name;
      }

      if (input.description !== undefined) {
        updateExpressions.push('#description = :description');
        expressionAttributeNames['#description'] = 'description';
        expressionAttributeValues[':description'] = input.description;
      }

      // updatedAt is always updated
      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = now;

      const command = new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({
          userId,
          knowledgeBaseId: input.knowledgeBaseId,
        }),
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: marshall(expressionAttributeValues, {
          removeUndefinedValues: true,
        }),
        ReturnValues: 'ALL_NEW',
      });

      const response = await this.dynamoClient.send(command);

      if (!response.Attributes) {
        throw new Error('Failed to update knowledge base');
      }

      return fromDynamoKnowledgeBase(unmarshall(response.Attributes) as DynamoKnowledgeBase);
    } catch (error) {
      console.error('Error updating knowledge base:', error);
      throw error;
    }
  }

  /**
   * Delete a knowledge base
   */
  async deleteKnowledgeBase(userId: string, knowledgeBaseId: string): Promise<void> {
    try {
      const kb = await this.getKnowledgeBase(userId, knowledgeBaseId);

      if (!kb) {
        throw new Error('Knowledge base not found');
      }

      // Delete Bedrock Knowledge Base if exists
      if (kb.bedrockKnowledgeBaseId) {
        try {
          const deleteCommand = new DeleteKnowledgeBaseCommand({
            knowledgeBaseId: kb.bedrockKnowledgeBaseId,
          });
          await this.bedrockClient.send(deleteCommand);
        } catch (error) {
          console.warn('Error deleting Bedrock Knowledge Base:', error);
          // Continue even if Bedrock deletion fails
        }
      }

      // Delete from DynamoDB
      const command = new DeleteItemCommand({
        TableName: this.tableName,
        Key: marshall({
          userId,
          knowledgeBaseId,
        }),
      });

      await this.dynamoClient.send(command);
    } catch (error) {
      console.error('Error deleting knowledge base:', error);
      throw new Error('Failed to delete knowledge base');
    }
  }

  /**
   * Sync knowledge base (start ingestion job)
   */
  async syncKnowledgeBase(
    userId: string,
    knowledgeBaseId: string
  ): Promise<KnowledgeBaseSyncResult> {
    try {
      const kb = await this.getKnowledgeBase(userId, knowledgeBaseId);

      if (!kb) {
        throw new Error('Knowledge base not found');
      }

      if (!kb.bedrockKnowledgeBaseId || !kb.bedrockDataSourceId) {
        throw new Error('Knowledge base is not fully configured');
      }

      const command = new StartIngestionJobCommand({
        knowledgeBaseId: kb.bedrockKnowledgeBaseId,
        dataSourceId: kb.bedrockDataSourceId,
      });

      const response = await this.bedrockClient.send(command);

      // Update sync status
      await this.updateSyncStatus(userId, knowledgeBaseId, 'SYNCING');

      return {
        ingestionJobId: response.ingestionJob?.ingestionJobId || '',
        status: response.ingestionJob?.status || 'IN_PROGRESS',
      };
    } catch (error) {
      console.error('Error syncing knowledge base:', error);
      throw new Error('Failed to sync knowledge base');
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(userId: string, knowledgeBaseId: string): Promise<string> {
    try {
      const kb = await this.getKnowledgeBase(userId, knowledgeBaseId);

      if (!kb) {
        throw new Error('Knowledge base not found');
      }

      if (!kb.bedrockKnowledgeBaseId || !kb.bedrockDataSourceId) {
        return 'PENDING';
      }

      // List recent ingestion jobs
      const command = new ListIngestionJobsCommand({
        knowledgeBaseId: kb.bedrockKnowledgeBaseId,
        dataSourceId: kb.bedrockDataSourceId,
        maxResults: 1,
      });

      const response = await this.bedrockClient.send(command);

      if (!response.ingestionJobSummaries || response.ingestionJobSummaries.length === 0) {
        return 'PENDING';
      }

      const latestJob = response.ingestionJobSummaries[0];
      return latestJob.status || 'PENDING';
    } catch (error) {
      console.error('Error getting sync status:', error);
      return 'FAILED';
    }
  }

  /**
   * Update sync status in DynamoDB
   */
  private async updateSyncStatus(
    userId: string,
    knowledgeBaseId: string,
    syncStatus: KnowledgeBase['syncStatus']
  ): Promise<void> {
    try {
      const command = new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({
          userId,
          knowledgeBaseId,
        }),
        UpdateExpression: 'SET #syncStatus = :syncStatus, #lastSyncAt = :lastSyncAt',
        ExpressionAttributeNames: {
          '#syncStatus': 'syncStatus',
          '#lastSyncAt': 'lastSyncAt',
        },
        ExpressionAttributeValues: marshall({
          ':syncStatus': syncStatus,
          ':lastSyncAt': new Date().toISOString(),
        }),
      });

      await this.dynamoClient.send(command);
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }

  /**
   * Get S3 upload prefix for documents
   */
  getDocumentUploadPrefix(knowledgeBaseId: string): string {
    return `kb-${knowledgeBaseId}`;
  }
}

/**
 * Create KnowledgeBaseService instance
 */
export function createKnowledgeBaseService(): KnowledgeBaseService {
  const tableName = config.knowledgeBaseTableName;
  const storageBucketName = config.knowledgeBaseStorageBucketName;
  const region = config.agentcore.region;
  const knowledgeBaseRoleArn = config.knowledgeBaseRoleArn;
  const s3VectorBucketName = config.s3VectorBucketName;

  if (!tableName) {
    throw new Error('KNOWLEDGE_BASE_TABLE_NAME environment variable is not set');
  }

  if (!storageBucketName) {
    throw new Error('KNOWLEDGE_BASE_STORAGE_BUCKET_NAME environment variable is not set');
  }

  return new KnowledgeBaseService(
    tableName,
    storageBucketName,
    region,
    knowledgeBaseRoleArn,
    s3VectorBucketName
  );
}
