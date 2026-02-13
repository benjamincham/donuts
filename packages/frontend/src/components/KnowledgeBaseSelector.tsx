/**
 * Knowledge Base Selector
 * Multi-select component for choosing Knowledge Bases to use in chat
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, ChevronDown, Check, X, Loader2 } from 'lucide-react';
import { useKnowledgeBaseStore } from '../stores/knowledgeBaseStore';

interface KnowledgeBaseSelectorProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  disabled?: boolean;
}

export const KnowledgeBaseSelector: React.FC<KnowledgeBaseSelectorProps> = ({
  selectedIds,
  onSelectionChange,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { knowledgeBases, isLoading, initializeStore } = useKnowledgeBaseStore();

  // Load knowledge bases on mount
  useEffect(() => {
    if (knowledgeBases.length === 0 && !isLoading) {
      initializeStore();
    }
  }, [initializeStore, knowledgeBases.length, isLoading]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter active knowledge bases only
  const activeKnowledgeBases = knowledgeBases.filter((kb) => kb.status === 'ACTIVE');

  // Get selected knowledge bases
  const selectedKBs = activeKnowledgeBases.filter((kb) => selectedIds.includes(kb.knowledgeBaseId));

  // Toggle selection
  const toggleSelection = (kbId: string) => {
    if (selectedIds.includes(kbId)) {
      onSelectionChange(selectedIds.filter((id) => id !== kbId));
    } else {
      onSelectionChange([...selectedIds, kbId]);
    }
  };

  // Remove a selected KB
  const removeSelection = (kbId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selectedIds.filter((id) => id !== kbId));
  };

  // Clear all selections
  const clearSelections = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange([]);
  };

  if (disabled) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-secondary rounded-md text-fg-disabled text-sm">
        <Database className="w-4 h-4" />
        <span>{t('knowledgeBase.selectorDisabled')}</span>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-surface-secondary hover:bg-surface-tertiary rounded-md text-sm transition-colors"
      >
        <Database className="w-4 h-4 text-blue-500" />
        <span className="text-fg-secondary">
          {selectedKBs.length === 0
            ? t('knowledgeBase.selectKnowledgeBase')
            : t('knowledgeBase.selectedCount', { count: selectedKBs.length })}
        </span>
        {selectedKBs.length > 0 ? (
          <span
            onClick={clearSelections}
            className="ml-1 p-0.5 hover:bg-surface-tertiary rounded-full"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-surface-primary border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-surface-primary border-b border-border px-3 py-2 flex items-center justify-between">
            <span className="text-sm font-medium text-fg-secondary">
              {t('knowledgeBase.availableKnowledgeBases')}
            </span>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-fg-muted" />}
          </div>

          {/* Loading state */}
          {isLoading && activeKnowledgeBases.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-fg-muted" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && activeKnowledgeBases.length === 0 && (
            <div className="px-3 py-4 text-center">
              <Database className="w-8 h-8 mx-auto text-fg-muted mb-2" />
              <p className="text-sm text-fg-muted">{t('knowledgeBase.noActiveKnowledgeBases')}</p>
            </div>
          )}

          {/* Knowledge base list */}
          <div className="py-1">
            {activeKnowledgeBases.map((kb) => (
              <button
                key={kb.knowledgeBaseId}
                onClick={() => toggleSelection(kb.knowledgeBaseId)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-secondary transition-colors text-left"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    selectedIds.includes(kb.knowledgeBaseId)
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-border'
                  }`}
                >
                  {selectedIds.includes(kb.knowledgeBaseId) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-fg-default truncate">{kb.name}</div>
                  <div className="text-xs text-fg-muted truncate">
                    {kb.description || t('knowledgeBase.noDescription')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected tags */}
      {selectedKBs.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedKBs.map((kb) => (
            <span
              key={kb.knowledgeBaseId}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
            >
              <Database className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{kb.name}</span>
              <button
                onClick={(e) => removeSelection(kb.knowledgeBaseId, e)}
                className="p-0.5 hover:bg-blue-100 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
