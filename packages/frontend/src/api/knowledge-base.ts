/**
 * Knowledge Base API Client
 */

import { backendClient } from './client/backend-client';
import type {
  KnowledgeBase,
  CreateKnowledgeBaseInput,
  KBDocument,
  KnowledgeBaseSyncResult,
  PresignedUploadUrl,
} from '../types/knowledge-base';

export interface KnowledgeBaseResponse {
  knowledgeBase: KnowledgeBase;
  metadata: {
    requestId: string;
    timestamp: string;
    userId: string;
  };
}

export interface KnowledgeBasesListResponse {
  knowledgeBases: KnowledgeBase[];
  metadata: {
    requestId: string;
    timestamp: string;
    userId: string;
    count: number;
  };
}

export interface DocumentsListResponse {
  documents: KBDocument[];
  knowledgeBaseId: string;
  metadata: {
    requestId: string;
    timestamp: string;
    count: number;
  };
}

/**
 * Parse knowledge base dates from API response
 */
function parseKnowledgeBaseDates(kb: KnowledgeBase): KnowledgeBase {
  return {
    ...kb,
    createdAt: new Date(kb.createdAt),
    updatedAt: new Date(kb.updatedAt),
    lastSyncAt: kb.lastSyncAt ? new Date(kb.lastSyncAt) : undefined,
  };
}

/**
 * Parse document dates from API response
 */
function parseDocumentDates(doc: KBDocument): KBDocument {
  return {
    ...doc,
    uploadedAt: new Date(doc.uploadedAt),
  };
}

/**
 * Get list of user's knowledge bases
 */
export async function listKnowledgeBases(): Promise<KnowledgeBase[]> {
  const data = await backendClient.get<KnowledgeBasesListResponse>('/knowledge-bases');
  return data.knowledgeBases.map(parseKnowledgeBaseDates);
}

/**
 * Get a specific knowledge base
 */
export async function getKnowledgeBase(knowledgeBaseId: string): Promise<KnowledgeBase> {
  const data = await backendClient.get<KnowledgeBaseResponse>(
    `/knowledge-bases/${knowledgeBaseId}`
  );
  return parseKnowledgeBaseDates(data.knowledgeBase);
}

/**
 * Create a new knowledge base
 */
export async function createKnowledgeBase(input: CreateKnowledgeBaseInput): Promise<KnowledgeBase> {
  const data = await backendClient.post<KnowledgeBaseResponse>('/knowledge-bases', input);
  return parseKnowledgeBaseDates(data.knowledgeBase);
}

/**
 * Update an existing knowledge base
 */
export async function updateKnowledgeBase(
  knowledgeBaseId: string,
  input: Partial<CreateKnowledgeBaseInput>
): Promise<KnowledgeBase> {
  const data = await backendClient.put<KnowledgeBaseResponse>(
    `/knowledge-bases/${knowledgeBaseId}`,
    input
  );
  return parseKnowledgeBaseDates(data.knowledgeBase);
}

/**
 * Delete a knowledge base
 */
export async function deleteKnowledgeBase(knowledgeBaseId: string): Promise<void> {
  return backendClient.delete<void>(`/knowledge-bases/${knowledgeBaseId}`);
}

/**
 * Sync a knowledge base (trigger ingestion job)
 */
export async function syncKnowledgeBase(knowledgeBaseId: string): Promise<KnowledgeBaseSyncResult> {
  return backendClient.post<KnowledgeBaseSyncResult>(`/knowledge-bases/${knowledgeBaseId}/sync`);
}

/**
 * Get sync status for a knowledge base
 */
export async function getSyncStatus(knowledgeBaseId: string): Promise<string> {
  const data = await backendClient.get<{ syncStatus: string }>(
    `/knowledge-bases/${knowledgeBaseId}/sync-status`
  );
  return data.syncStatus;
}

/**
 * List documents in a knowledge base
 */
export async function listDocuments(knowledgeBaseId: string): Promise<KBDocument[]> {
  const data = await backendClient.get<DocumentsListResponse>(
    `/knowledge-bases/${knowledgeBaseId}/documents`
  );
  return data.documents.map(parseDocumentDates);
}

/**
 * Generate presigned upload URL for document
 */
export async function generateUploadUrl(
  knowledgeBaseId: string,
  fileName: string,
  contentType: string,
  size: number
): Promise<PresignedUploadUrl> {
  return backendClient.post<PresignedUploadUrl>(
    `/knowledge-bases/${knowledgeBaseId}/documents/upload-url`,
    {
      fileName,
      contentType,
      size,
    }
  );
}

/**
 * Upload file to S3 using presigned URL
 * Note: This is direct S3 upload, not using backend client
 */
export async function uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload file to S3: ${response.statusText}`);
  }
}

/**
 * Delete a document from a knowledge base
 */
export async function deleteDocument(knowledgeBaseId: string, documentId: string): Promise<void> {
  return backendClient.delete<void>(`/knowledge-bases/${knowledgeBaseId}/documents/${documentId}`);
}
