import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import type { KnowledgeBase, KBDocument } from '../types/knowledge-base';
import * as knowledgeBaseApi from '../api/knowledge-base';
import { Button } from './ui/Button';

interface KnowledgeBaseDetailProps {
  knowledgeBase: KnowledgeBase;
  onBack: () => void;
  onDelete: (kb: KnowledgeBase) => void;
  onSync: (kbId: string) => Promise<void>;
}

interface DocumentItemProps {
  document: KBDocument;
  onDelete: (doc: KBDocument) => void;
  isDeleting: boolean;
}

function DocumentItem({ document, onDelete, isDeleting }: DocumentItemProps) {
  const { t } = useTranslation();

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = () => {
    switch (document.status) {
      case 'indexed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (document.status) {
      case 'indexed':
        return t('knowledgeBase.documentStatusIndexed');
      case 'processing':
        return t('knowledgeBase.documentStatusProcessing');
      case 'failed':
        return t('knowledgeBase.documentStatusFailed');
      default:
        return t('knowledgeBase.documentStatusUploaded');
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-surface-secondary transition-colors">
      <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-fg-default truncate">{document.fileName}</div>
        <div className="flex items-center gap-3 text-xs text-fg-muted mt-1">
          <span>{formatSize(document.size)}</span>
          <span>{formatDate(document.uploadedAt)}</span>
          <span className="flex items-center gap-1">
            {getStatusIcon()}
            {getStatusText()}
          </span>
        </div>
      </div>
      <button
        onClick={() => onDelete(document)}
        disabled={isDeleting}
        className="p-2 text-fg-disabled hover:text-feedback-error hover:bg-feedback-error-bg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={t('common.delete')}
      >
        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  );
}

export const KnowledgeBaseDetail: React.FC<KnowledgeBaseDetailProps> = ({
  knowledgeBase,
  onBack,
  onDelete,
  onSync,
}) => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const docs = await knowledgeBaseApi.listDocuments(knowledgeBase.knowledgeBaseId);
      setDocuments(docs);
    } catch {
      setError(t('knowledgeBase.failedToLoadDocuments'));
    } finally {
      setIsLoading(false);
    }
  }, [knowledgeBase.knowledgeBaseId, t]);

  const getStatusIcon = () => {
    switch (knowledgeBase.status) {
      case 'ACTIVE':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'CREATING':
      case 'UPDATING':
        return <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />;
      case 'FAILED':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (knowledgeBase.status) {
      case 'ACTIVE':
        return t('knowledgeBase.statusActive');
      case 'CREATING':
        return t('knowledgeBase.statusCreating');
      case 'UPDATING':
        return t('knowledgeBase.statusUpdating');
      case 'DELETING':
        return t('knowledgeBase.statusDeleting');
      case 'FAILED':
        return t('knowledgeBase.statusFailed');
      default:
        return t('knowledgeBase.statusPending');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Filter for PDF files only
    const pdfFiles = Array.from(files).filter((file) => file.type === 'application/pdf');
    if (pdfFiles.length === 0) {
      setError(t('knowledgeBase.onlyPdfAllowed'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      let completed = 0;
      for (const file of pdfFiles) {
        // Get presigned URL
        const uploadInfo = await knowledgeBaseApi.generateUploadUrl(
          knowledgeBase.knowledgeBaseId,
          file.name,
          file.type,
          file.size
        );

        // Upload to S3
        await knowledgeBaseApi.uploadFileToS3(uploadInfo.uploadUrl, file);

        completed++;
        setUploadProgress(Math.round((completed / pdfFiles.length) * 100));
      }

      // Reload documents
      await loadDocuments();
    } catch {
      setError(t('knowledgeBase.failedToUpload'));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteDocument = async (document: KBDocument) => {
    if (!window.confirm(t('knowledgeBase.deleteDocumentConfirm', { name: document.fileName }))) {
      return;
    }

    setDeletingDocId(document.documentId);
    try {
      await knowledgeBaseApi.deleteDocument(knowledgeBase.knowledgeBaseId, document.documentId);
      setDocuments((prev) => prev.filter((d) => d.documentId !== document.documentId));
    } catch {
      setError(t('knowledgeBase.failedToDeleteDocument'));
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSync(knowledgeBase.knowledgeBaseId);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-fg-secondary hover:text-fg-default hover:bg-surface-secondary rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-fg-default">{knowledgeBase.name}</h2>
            <div className="flex items-center gap-2 text-sm text-fg-muted mt-0.5">
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={RefreshCw}
            onClick={handleSync}
            loading={isSyncing}
            disabled={knowledgeBase.status !== 'ACTIVE'}
          >
            {t('knowledgeBase.sync')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={Trash2}
            onClick={() => onDelete(knowledgeBase)}
            disabled={knowledgeBase.status === 'DELETING'}
          >
            {t('common.delete')}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-feedback-error-bg border border-feedback-error-border rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-feedback-error mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-feedback-error break-words">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-sm text-feedback-error hover:underline mt-1"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        )}

        {/* KB Info */}
        <div className="mb-6 p-4 bg-surface-secondary rounded-lg">
          <div className="text-sm text-fg-secondary mb-1">
            {t('knowledgeBase.descriptionLabel')}
          </div>
          <p className="text-sm text-fg-default">
            {knowledgeBase.description || t('knowledgeBase.noDescription')}
          </p>
          <div className="mt-3 text-xs text-fg-muted">
            {t('knowledgeBase.createdAt')}: {formatDate(knowledgeBase.createdAt)}
          </div>
        </div>

        {/* Documents section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-fg-secondary">
              {t('knowledgeBase.documents')} ({documents.length})
            </h3>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="secondary"
                size="sm"
                leftIcon={Upload}
                onClick={() => fileInputRef.current?.click()}
                loading={isUploading}
                disabled={knowledgeBase.status !== 'ACTIVE'}
              >
                {t('knowledgeBase.upload')}
              </Button>
            </div>
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-fg-secondary mb-1">
                <span>{t('knowledgeBase.uploading')}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-border rounded-full h-2">
                <div
                  className="bg-action-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Documents list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-fg-disabled" />
              <span className="ml-2 text-sm text-fg-secondary">{t('common.loading')}</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <FileText className="w-12 h-12 text-fg-disabled mx-auto mb-3" />
              <p className="text-sm text-fg-secondary mb-1">{t('knowledgeBase.noDocuments')}</p>
              <p className="text-xs text-fg-muted">{t('knowledgeBase.uploadPdfHint')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <DocumentItem
                  key={doc.documentId}
                  document={doc}
                  onDelete={handleDeleteDocument}
                  isDeleting={deletingDocId === doc.documentId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
