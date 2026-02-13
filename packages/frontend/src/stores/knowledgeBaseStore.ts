/**
 * Knowledge Base Zustand store (API + LocalStorage)
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  KnowledgeBase,
  CreateKnowledgeBaseInput,
  UpdateKnowledgeBaseInput,
  KnowledgeBaseStore,
} from '../types/knowledge-base';
import * as knowledgeBaseApi from '../api/knowledge-base';
import { logger } from '../utils/logger';
import { extractErrorMessage } from '../utils/store-helpers';

/**
 * KnowledgeBaseStore implementation
 */
export const useKnowledgeBaseStore = create<KnowledgeBaseStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        knowledgeBases: [],
        selectedKnowledgeBases: [],
        isLoading: false,
        error: null,

        // Knowledge Base CRUD operations
        createKnowledgeBase: async (input: CreateKnowledgeBaseInput) => {
          set({ isLoading: true, error: null });

          try {
            const newKnowledgeBase = await knowledgeBaseApi.createKnowledgeBase(input);

            set((state) => ({
              knowledgeBases: [...state.knowledgeBases, newKnowledgeBase],
              isLoading: false,
              error: null,
            }));

            return newKnowledgeBase;
          } catch (error) {
            const errorMessage = extractErrorMessage(error, 'Failed to create knowledge base');
            set({ isLoading: false, error: errorMessage });
            throw error;
          }
        },

        updateKnowledgeBase: async (input: UpdateKnowledgeBaseInput) => {
          set({ isLoading: true, error: null });

          try {
            const updatedKnowledgeBase = await knowledgeBaseApi.updateKnowledgeBase(
              input.knowledgeBaseId,
              input
            );

            set((state) => {
              const kbIndex = state.knowledgeBases.findIndex(
                (kb) => kb.knowledgeBaseId === input.knowledgeBaseId
              );
              const updatedKnowledgeBases = [...state.knowledgeBases];

              if (kbIndex !== -1) {
                updatedKnowledgeBases[kbIndex] = updatedKnowledgeBase;
              }

              return {
                knowledgeBases: updatedKnowledgeBases,
                isLoading: false,
                error: null,
              };
            });
          } catch (error) {
            const errorMessage = extractErrorMessage(error, 'Failed to update knowledge base');
            set({ isLoading: false, error: errorMessage });
            throw error;
          }
        },

        deleteKnowledgeBase: async (knowledgeBaseId: string) => {
          set({ isLoading: true, error: null });

          try {
            await knowledgeBaseApi.deleteKnowledgeBase(knowledgeBaseId);

            set((state) => {
              const updatedKnowledgeBases = state.knowledgeBases.filter(
                (kb) => kb.knowledgeBaseId !== knowledgeBaseId
              );

              // Remove from selected if it was selected
              const updatedSelected = state.selectedKnowledgeBases.filter(
                (id) => id !== knowledgeBaseId
              );

              return {
                knowledgeBases: updatedKnowledgeBases,
                selectedKnowledgeBases: updatedSelected,
                isLoading: false,
                error: null,
              };
            });
          } catch (error) {
            const errorMessage = extractErrorMessage(error, 'Failed to delete knowledge base');
            set({ isLoading: false, error: errorMessage });
            throw error;
          }
        },

        getKnowledgeBase: (knowledgeBaseId: string) => {
          return get().knowledgeBases.find((kb) => kb.knowledgeBaseId === knowledgeBaseId);
        },

        // Sync operations
        syncKnowledgeBase: async (knowledgeBaseId: string) => {
          set({ isLoading: true, error: null });

          try {
            const result = await knowledgeBaseApi.syncKnowledgeBase(knowledgeBaseId);

            // Update the knowledge base status to reflect syncing
            set((state) => ({
              knowledgeBases: state.knowledgeBases.map((kb) =>
                kb.knowledgeBaseId === knowledgeBaseId
                  ? { ...kb, syncStatus: 'SYNCING' as const }
                  : kb
              ),
              isLoading: false,
              error: null,
            }));

            return result;
          } catch (error) {
            const errorMessage = extractErrorMessage(error, 'Failed to sync knowledge base');
            set({ isLoading: false, error: errorMessage });
            throw error;
          }
        },

        getSyncStatus: async (knowledgeBaseId: string) => {
          try {
            const syncStatus = await knowledgeBaseApi.getSyncStatus(knowledgeBaseId);

            // Update the knowledge base with the new sync status
            set((state) => ({
              knowledgeBases: state.knowledgeBases.map((kb) =>
                kb.knowledgeBaseId === knowledgeBaseId
                  ? { ...kb, syncStatus: syncStatus as KnowledgeBase['syncStatus'] }
                  : kb
              ),
            }));

            return syncStatus;
          } catch (error) {
            logger.error('Failed to get sync status:', error);
            throw error;
          }
        },

        // Selection for chat
        selectKnowledgeBase: (knowledgeBaseId: string) => {
          set((state) => {
            if (state.selectedKnowledgeBases.includes(knowledgeBaseId)) {
              return state;
            }
            return {
              selectedKnowledgeBases: [...state.selectedKnowledgeBases, knowledgeBaseId],
            };
          });
        },

        deselectKnowledgeBase: (knowledgeBaseId: string) => {
          set((state) => ({
            selectedKnowledgeBases: state.selectedKnowledgeBases.filter(
              (id) => id !== knowledgeBaseId
            ),
          }));
        },

        clearSelectedKnowledgeBases: () => {
          set({ selectedKnowledgeBases: [] });
        },

        // Initialization
        initializeStore: async () => {
          set({ isLoading: true, error: null });

          try {
            logger.log('📚 KnowledgeBaseStore initialization started...');

            const knowledgeBases = await knowledgeBaseApi.listKnowledgeBases();

            logger.log(
              `✅ KnowledgeBaseStore initialization complete: ${knowledgeBases.length} items`
            );

            set({
              knowledgeBases,
              isLoading: false,
              error: null,
            });
          } catch (error) {
            logger.error('💥 KnowledgeBaseStore initialization error:', error);
            set({
              knowledgeBases: [],
              isLoading: false,
              error: extractErrorMessage(error, 'Failed to initialize store'),
            });
          }
        },

        refreshKnowledgeBases: async () => {
          // Background refresh (no loading state to keep existing data visible)
          try {
            logger.log('🔄 Refreshing knowledge base list in background...');
            const knowledgeBases = await knowledgeBaseApi.listKnowledgeBases();

            set((state) => {
              // Verify selected knowledge bases still exist
              const validSelectedIds = state.selectedKnowledgeBases.filter((id) =>
                knowledgeBases.some((kb) => kb.knowledgeBaseId === id)
              );

              return {
                knowledgeBases,
                selectedKnowledgeBases: validSelectedIds,
              };
            });

            logger.log(`✅ Knowledge base list refresh complete: ${knowledgeBases.length} items`);
          } catch (error) {
            // Silently handle errors (keep existing data)
            logger.error('💥 Knowledge base list refresh error:', error);
          }
        },

        clearError: () => {
          set({ error: null });
        },

        clearStore: () => {
          logger.log('🧹 Clearing KnowledgeBaseStore...');
          set({
            knowledgeBases: [],
            selectedKnowledgeBases: [],
            isLoading: false,
            error: null,
          });
        },
      }),
      {
        name: 'knowledgebase-selected',
        partialize: (state) => ({
          selectedKnowledgeBases: state.selectedKnowledgeBases,
        }),
      }
    ),
    {
      name: 'knowledge-base-store',
      enabled: import.meta.env.DEV,
    }
  )
);

/**
 * Helper hook to get selected knowledge bases
 */
export const useSelectedKnowledgeBases = () => {
  return useKnowledgeBaseStore((state) => state.selectedKnowledgeBases);
};

/**
 * Helper hook to get the knowledge base list
 */
export const useKnowledgeBases = () => {
  return useKnowledgeBaseStore((state) => state.knowledgeBases);
};
