/**
 * Memory Store
 * AgentCore Memory 管理用のZustand store
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  fetchMemoryRecords,
  deleteMemoryRecord as apiDeleteMemoryRecord,
  searchMemoryRecords as apiSearchMemoryRecords,
  type MemoryRecord,
  type MemoryType,
} from '../api/memory';

/**
 * Memory Store の状態
 */
interface MemoryState {
  // メモリ参照のON/OFF設定
  isMemoryEnabled: boolean;

  // メモリレコード（preferences と facts）
  preferenceRecords: MemoryRecord[];
  factRecords: MemoryRecord[];

  // ローディング状態
  isLoading: boolean;
  isDeleting: string | null; // 削除中のレコードID

  // エラー状態
  error: string | null;

  // ページネーション
  preferenceNextToken?: string;
  factNextToken?: string;

  // アクション
  setMemoryEnabled: (enabled: boolean) => void;
  loadMemoryRecords: (type: MemoryType) => Promise<void>;
  deleteMemoryRecord: (recordId: string, type: MemoryType) => Promise<void>;
  searchMemoryRecords: (query: string, type: MemoryType) => Promise<MemoryRecord[]>;
  clearError: () => void;
}

/**
 * Memory Store
 */
export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      // 初期状態
      isMemoryEnabled: true, // デフォルトはON
      preferenceRecords: [],
      factRecords: [],
      isLoading: false,
      isDeleting: null,
      error: null,

      /**
       * メモリ参照のON/OFF設定
       */
      setMemoryEnabled: (enabled: boolean) => {
        set({ isMemoryEnabled: enabled });
        console.log(`[MemoryStore] Memory enabled: ${enabled}`);
      },

      /**
       * メモリレコード一覧を取得
       */
      loadMemoryRecords: async (type: MemoryType) => {
        try {
          set({ isLoading: true, error: null });

          const data = await fetchMemoryRecords(type);

          // 状態を更新
          if (type === 'preferences') {
            set({
              preferenceRecords: data.records,
              preferenceNextToken: data.nextToken,
            });
          } else {
            set({
              factRecords: data.records,
              factNextToken: data.nextToken,
            });
          }

          console.log(`[MemoryStore] Loaded ${data.records.length} ${type} records`);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : '不明なエラーが発生しました';
          set({ error: errorMessage });
          console.error(`[MemoryStore] Error loading ${type} records:`, error);
        } finally {
          set({ isLoading: false });
        }
      },

      /**
       * メモリレコードを削除
       */
      deleteMemoryRecord: async (recordId: string, type: MemoryType) => {
        try {
          set({ isDeleting: recordId, error: null });

          await apiDeleteMemoryRecord(recordId, type);

          // ローカル状態からレコードを削除
          const currentState = get();
          if (type === 'preferences') {
            set({
              preferenceRecords: currentState.preferenceRecords.filter(
                (r) => r.recordId !== recordId
              ),
            });
          } else if (type === 'facts') {
            set({
              factRecords: currentState.factRecords.filter((r) => r.recordId !== recordId),
            });
          }

          console.log(`[MemoryStore] Deleted memory record: ${recordId}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '削除に失敗しました';
          set({ error: errorMessage });
          console.error(`[MemoryStore] Error deleting memory record:`, error);
        } finally {
          set({ isDeleting: null });
        }
      },

      /**
       * メモリレコードをセマンティック検索
       */
      searchMemoryRecords: async (query: string, type: MemoryType): Promise<MemoryRecord[]> => {
        try {
          const records = await apiSearchMemoryRecords({
            type,
            query,
            topK: 20,
            relevanceScore: 0.2,
          });

          console.log(`[MemoryStore] Found ${records.length} records for query: "${query}"`);
          return records;
        } catch (error) {
          console.error(`[MemoryStore] Error searching memory records:`, error);
          return [];
        }
      },

      /**
       * エラーをクリア
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'memory-settings',
      // メモリ参照設定のみを永続化（レコード自体は毎回取得）
      partialize: (state) => ({
        isMemoryEnabled: state.isMemoryEnabled,
      }),
    }
  )
);
