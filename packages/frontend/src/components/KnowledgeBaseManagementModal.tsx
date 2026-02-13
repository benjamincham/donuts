/**
 * Knowledge Base Management Modal
 * Modal for managing user Knowledge Bases
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Trash2,
  RefreshCw,
  BookOpen,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useKnowledgeBaseStore } from '../stores/knowledgeBaseStore';
import { Modal } from './ui/Modal/Modal';
import { KnowledgeBaseForm } from './KnowledgeBaseForm';
import { KnowledgeBaseDetail } from './KnowledgeBaseDetail';
import type { KnowledgeBase, CreateKnowledgeBaseInput } from '../types/knowledge-base';

interface KnowledgeBaseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'list' | 'create' | 'detail';

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: KnowledgeBase['status'] }) {
  const { t } = useTranslation();

  const statusConfig = {
    CREATING: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-50', animate: true },
    ACTIVE: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', animate: false },
    UPDATING: { icon: Loader2, color: 'text-yellow-500', bg: 'bg-yellow-50', animate: true },
    DELETING: { icon: Loader2, color: 'text-red-500', bg: 'bg-red-50', animate: true },
    FAILED: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', animate: false },
    PENDING: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50', animate: false },
  };

  const config = statusConfig[status] || statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}
    >
      <Icon className={`w-3.5 h-3.5 ${config.animate ? 'animate-spin' : ''}`} />
      {t(`knowledgeBase.status.${status.toLowerCase()}`)}
    </span>
  );
}

/**
 * Sync status badge component
 */
function SyncStatusBadge({ syncStatus }: { syncStatus?: KnowledgeBase['syncStatus'] }) {
  const { t } = useTranslation();

  if (!syncStatus) return null;

  const statusConfig = {
    SYNCING: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-50', animate: true },
    SYNCED: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', animate: false },
    FAILED: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', animate: false },
    PENDING: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50', animate: false },
  };

  const config = statusConfig[syncStatus] || statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${config.bg} ${config.color}`}
    >
      <Icon className={`w-3 h-3 ${config.animate ? 'animate-spin' : ''}`} />
      {t(`knowledgeBase.syncStatus.${syncStatus.toLowerCase()}`)}
    </span>
  );
}

/**
 * Knowledge Base List Item
 */
function KnowledgeBaseListItem({
  kb,
  onSelect,
  onDelete,
  onSync,
  isDeleting,
  isSyncing,
}: {
  kb: KnowledgeBase;
  onSelect: (kb: KnowledgeBase) => void;
  onDelete: (kb: KnowledgeBase) => void;
  onSync: (kbId: string) => void;
  isDeleting: boolean;
  isSyncing: boolean;
}) {
  const { t } = useTranslation();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('knowledgeBase.deleteConfirm', { name: kb.name }))) {
      onDelete(kb);
    }
  };

  const handleSync = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSync(kb.knowledgeBaseId);
  };

  return (
    <div
      onClick={() => onSelect(kb)}
      className="group flex items-center gap-4 p-4 rounded-lg border border-border bg-surface-primary hover:bg-surface-secondary cursor-pointer transition-colors"
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center">
        <BookOpen className="w-6 h-6 text-primary-600" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-fg-default truncate">{kb.name}</h3>
          <StatusBadge status={kb.status} />
        </div>
        <p className="text-sm text-fg-muted truncate mt-0.5">
          {kb.description || t('knowledgeBase.noDescription')}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <SyncStatusBadge syncStatus={kb.syncStatus} />
          <span className="text-xs text-fg-muted">
            {t('knowledgeBase.createdAt', { date: kb.createdAt.toLocaleDateString() })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleSync}
          disabled={isSyncing || kb.status !== 'ACTIVE'}
          className="p-2 rounded-lg hover:bg-surface-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
          title={t('knowledgeBase.sync')}
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 rounded-lg hover:bg-feedback-error/10 text-feedback-error disabled:opacity-50 disabled:cursor-not-allowed"
          title={t('knowledgeBase.delete')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <ChevronRight className="w-5 h-5 text-fg-muted" />
      </div>
    </div>
  );
}

/**
 * Knowledge Base Management Modal
 */
export function KnowledgeBaseManagementModal({
  isOpen,
  onClose,
}: KnowledgeBaseManagementModalProps) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const {
    knowledgeBases,
    isLoading,
    error,
    initializeStore,
    createKnowledgeBase,
    deleteKnowledgeBase,
    syncKnowledgeBase,
    clearError,
  } = useKnowledgeBaseStore();

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      initializeStore();
      setViewMode('list');
      setSelectedKB(null);
    }
  }, [isOpen, initializeStore]);

  // Handle create
  const handleCreate = async (input: CreateKnowledgeBaseInput) => {
    try {
      await createKnowledgeBase(input);
      setViewMode('list');
    } catch {
      // Error is handled by store
    }
  };

  // Handle delete
  const handleDelete = async (kb: KnowledgeBase) => {
    setDeletingId(kb.knowledgeBaseId);
    try {
      await deleteKnowledgeBase(kb.knowledgeBaseId);
    } finally {
      setDeletingId(null);
    }
  };

  // Handle sync
  const handleSync = async (kbId: string) => {
    setSyncingId(kbId);
    try {
      await syncKnowledgeBase(kbId);
    } finally {
      setSyncingId(null);
    }
  };

  // Handle select
  const handleSelect = (kb: KnowledgeBase) => {
    setSelectedKB(kb);
    setViewMode('detail');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-feedback-error/10 border border-feedback-error/20 flex items-center gap-2 text-feedback-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm flex-1">{error}</p>
          <button onClick={clearError} className="text-sm underline">
            {t('common.dismiss')}
          </button>
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-fg-muted">
              {t('knowledgeBase.count', { count: knowledgeBases.length })}
            </p>
            <button
              onClick={() => setViewMode('create')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('knowledgeBase.create')}
            </button>
          </div>

          {/* Loading state */}
          {isLoading && knowledgeBases.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && knowledgeBases.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-fg-muted mb-4" />
              <h3 className="font-medium text-fg-default mb-1">{t('knowledgeBase.emptyTitle')}</h3>
              <p className="text-sm text-fg-muted mb-4">{t('knowledgeBase.emptyDescription')}</p>
              <button
                onClick={() => setViewMode('create')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('knowledgeBase.create')}
              </button>
            </div>
          )}

          {/* Knowledge base list */}
          <div className="space-y-3">
            {knowledgeBases.map((kb) => (
              <KnowledgeBaseListItem
                key={kb.knowledgeBaseId}
                kb={kb}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onSync={handleSync}
                isDeleting={deletingId === kb.knowledgeBaseId}
                isSyncing={syncingId === kb.knowledgeBaseId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create view */}
      {viewMode === 'create' && (
        <KnowledgeBaseForm
          onSubmit={handleCreate}
          onCancel={() => setViewMode('list')}
          isLoading={isLoading}
        />
      )}

      {/* Detail view */}
      {viewMode === 'detail' && selectedKB && (
        <KnowledgeBaseDetail
          knowledgeBase={selectedKB}
          onBack={() => setViewMode('list')}
          onDelete={handleDelete}
          onSync={handleSync}
        />
      )}
    </Modal>
  );
}
