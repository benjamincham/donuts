/**
 * Knowledge Base related type definitions
 */

export interface KnowledgeBase {
  knowledgeBaseId: string;
  name: string;
  description: string;
  bedrockKnowledgeBaseId?: string;
  bedrockDataSourceId?: string;
  s3BucketArn?: string;
  s3Prefix?: string;
  embeddingModelArn?: string;
  status: 'CREATING' | 'ACTIVE' | 'UPDATING' | 'DELETING' | 'FAILED' | 'PENDING';
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt?: Date;
  syncStatus?: 'SYNCING' | 'SYNCED' | 'FAILED' | 'PENDING';
}

export interface KBDocument {
  documentId: string;
  fileName: string;
  contentType: string;
  size: number;
  s3Key: string;
  s3Url: string;
  uploadedAt: Date;
  knowledgeBaseId: string;
  status: 'uploaded' | 'processing' | 'indexed' | 'failed';
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

export interface KnowledgeBaseState {
  knowledgeBases: KnowledgeBase[];
  selectedKnowledgeBases: string[];
  isLoading: boolean;
  error: string | null;
}

export interface KnowledgeBaseActions {
  // Knowledge Base CRUD (async)
  createKnowledgeBase: (input: CreateKnowledgeBaseInput) => Promise<KnowledgeBase>;
  updateKnowledgeBase: (input: UpdateKnowledgeBaseInput) => Promise<void>;
  deleteKnowledgeBase: (id: string) => Promise<void>;
  getKnowledgeBase: (id: string) => KnowledgeBase | undefined;

  // Sync operations
  syncKnowledgeBase: (id: string) => Promise<KnowledgeBaseSyncResult>;
  getSyncStatus: (id: string) => Promise<string>;

  // Selection for chat
  selectKnowledgeBase: (id: string) => void;
  deselectKnowledgeBase: (id: string) => void;
  clearSelectedKnowledgeBases: () => void;

  // Initialization
  initializeStore: () => Promise<void>;
  refreshKnowledgeBases: () => Promise<void>;
  clearStore: () => void;
  clearError: () => void;
}

export type KnowledgeBaseStore = KnowledgeBaseState & KnowledgeBaseActions;
