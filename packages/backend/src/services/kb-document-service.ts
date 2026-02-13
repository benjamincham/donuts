/**
 * Knowledge Base Document Service
 * Manages document uploads and retrieval for Knowledge Base
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';

export interface KBDocument {
  documentId: string;
  fileName: string;
  contentType: string;
  size: number;
  s3Key: string;
  s3Url: string;
  uploadedAt: string;
  knowledgeBaseId: string;
  userId: string;
  status: 'uploaded' | 'processing' | 'indexed' | 'failed';
}

export interface UploadDocumentInput {
  fileName: string;
  contentType: string;
  size: number;
}

export interface PresignedUploadUrl {
  uploadUrl: string;
  documentId: string;
  s3Key: string;
  expiresIn: number;
}

export interface DocumentListResult {
  documents: KBDocument[];
  totalCount: number;
}

/**
 * Knowledge Base Document Service Class
 */
export class KBDocumentService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(bucketName: string, region?: string) {
    this.bucketName = bucketName;
    this.s3Client = new S3Client({ region: region || process.env.AWS_REGION || 'ap-southeast-1' });
  }

  /**
   * Generate presigned URL for document upload
   */
  async generateUploadUrl(
    userId: string,
    knowledgeBaseId: string,
    input: UploadDocumentInput
  ): Promise<PresignedUploadUrl> {
    try {
      const documentId = uuidv4();
      const s3Key = `kb-${knowledgeBaseId}/${documentId}/${input.fileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ContentType: input.contentType,
        Metadata: {
          'user-id': userId,
          'knowledge-base-id': knowledgeBaseId,
          'document-id': documentId,
          'original-filename': input.fileName,
        },
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 }); // 5 minutes

      return {
        uploadUrl,
        documentId,
        s3Key,
        expiresIn: 300,
      };
    } catch (error) {
      console.error('Error generating upload URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  /**
   * List documents for a knowledge base
   */
  async listDocuments(
    userId: string,
    knowledgeBaseId: string,
    _prefix?: string
  ): Promise<DocumentListResult> {
    try {
      const s3Prefix = `kb-${knowledgeBaseId}/`;

      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: s3Prefix,
        MaxKeys: 1000,
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents || response.Contents.length === 0) {
        return { documents: [], totalCount: 0 };
      }

      const documents: KBDocument[] = [];

      for (const object of response.Contents) {
        if (!object.Key) continue;

        // Parse S3 key to extract document info
        // Format: kb-{knowledgeBaseId}/{documentId}/{fileName}
        const keyParts = object.Key.split('/');
        if (keyParts.length < 3) continue;

        const documentId = keyParts[1];
        const fileName = keyParts[2];

        // Skip if it's a folder
        if (object.Key.endsWith('/')) continue;

        documents.push({
          documentId,
          fileName,
          contentType: this.getContentTypeFromKey(object.Key),
          size: object.Size || 0,
          s3Key: object.Key,
          s3Url: `s3://${this.bucketName}/${object.Key}`,
          uploadedAt: object.LastModified?.toISOString() || new Date().toISOString(),
          knowledgeBaseId,
          userId,
          status: 'uploaded',
        });
      }

      return {
        documents,
        totalCount: documents.length,
      };
    } catch (error) {
      console.error('Error listing documents:', error);
      throw new Error('Failed to list documents');
    }
  }

  /**
   * Get document details
   */
  async getDocument(
    userId: string,
    knowledgeBaseId: string,
    documentId: string
  ): Promise<KBDocument | null> {
    try {
      // List objects to find the document
      const s3Prefix = `kb-${knowledgeBaseId}/${documentId}/`;

      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: s3Prefix,
        MaxKeys: 1,
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents || response.Contents.length === 0) {
        return null;
      }

      const object = response.Contents[0];
      if (!object.Key) return null;

      const keyParts = object.Key.split('/');
      if (keyParts.length < 3) return null;

      const fileName = keyParts[2];

      return {
        documentId,
        fileName,
        contentType: this.getContentTypeFromKey(object.Key),
        size: object.Size || 0,
        s3Key: object.Key,
        s3Url: `s3://${this.bucketName}/${object.Key}`,
        uploadedAt: object.LastModified?.toISOString() || new Date().toISOString(),
        knowledgeBaseId,
        userId,
        status: 'uploaded',
      };
    } catch (error) {
      console.error('Error getting document:', error);
      throw new Error('Failed to get document');
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(userId: string, knowledgeBaseId: string, documentId: string): Promise<void> {
    try {
      // First, list to find the exact key
      const s3Prefix = `kb-${knowledgeBaseId}/${documentId}/`;

      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: s3Prefix,
        MaxKeys: 1,
      });

      const listResponse = await this.s3Client.send(listCommand);

      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        throw new Error('Document not found');
      }

      const s3Key = listResponse.Contents[0].Key;
      if (!s3Key) {
        throw new Error('Document not found');
      }

      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(deleteCommand);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error('Failed to delete document');
    }
  }

  /**
   * Generate presigned URL for document download
   */
  async generateDownloadUrl(
    userId: string,
    knowledgeBaseId: string,
    documentId: string
  ): Promise<string> {
    try {
      // First, list to find the exact key
      const s3Prefix = `kb-${knowledgeBaseId}/${documentId}/`;

      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: s3Prefix,
        MaxKeys: 1,
      });

      const listResponse = await this.s3Client.send(listCommand);

      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        throw new Error('Document not found');
      }

      const s3Key = listResponse.Contents[0].Key;
      if (!s3Key) {
        throw new Error('Document not found');
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 }); // 5 minutes

      return downloadUrl;
    } catch (error) {
      console.error('Error generating download URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  /**
   * Get content type from S3 key
   */
  private getContentTypeFromKey(key: string): string {
    const extension = key.split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      txt: 'text/plain',
      md: 'text/markdown',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      html: 'text/html',
      htm: 'text/html',
      json: 'application/json',
      csv: 'text/csv',
      xml: 'application/xml',
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  /**
   * Validate file type for knowledge base
   */
  isValidFileType(fileName: string): boolean {
    const validExtensions = [
      '.pdf',
      '.txt',
      '.md',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx',
      '.html',
      '.htm',
      '.json',
      '.csv',
      '.xml',
    ];

    const extension = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
    return validExtensions.includes(extension);
  }

  /**
   * Get max file size (50MB)
   */
  getMaxFileSize(): number {
    return 50 * 1024 * 1024; // 50MB
  }
}

/**
 * Create KBDocumentService instance
 */
export function createKBDocumentService(): KBDocumentService {
  const bucketName = config.knowledgeBaseStorageBucketName;
  const region = config.agentcore.region;

  if (!bucketName) {
    throw new Error('KNOWLEDGE_BASE_STORAGE_BUCKET_NAME environment variable is not set');
  }

  return new KBDocumentService(bucketName, region);
}
