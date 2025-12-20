/**
 * セッション管理機能のエクスポート
 */

import type { SessionStorage } from './types.js';
import { FileSessionStorage } from './file-session-storage.js';
import { AgentCoreMemoryStorage } from './agentcore-memory-storage.js';

export type { SessionConfig, SessionStorage } from './types.js';
export { FileSessionStorage } from './file-session-storage.js';
export { AgentCoreMemoryStorage } from './agentcore-memory-storage.js';
export { SessionPersistenceHook } from './session-persistence-hook.js';

/**
 * 環境変数に基づいてSessionStorageを作成する
 * @returns 適切なSessionStorageインスタンス
 */
export function createSessionStorage(): SessionStorage {
  const useAgentCoreMemory = process.env.USE_AGENTCORE_MEMORY === 'true';

  if (useAgentCoreMemory) {
    const memoryId = process.env.AGENTCORE_MEMORY_ID;
    const region = process.env.AWS_REGION || 'us-east-1';

    if (!memoryId) {
      console.warn(
        '[SessionStorage] AGENTCORE_MEMORY_ID is not set, falling back to FileSessionStorage'
      );
      return new FileSessionStorage();
    }

    console.log(`[SessionStorage] Using AgentCore Memory: ${memoryId} (${region})`);
    return new AgentCoreMemoryStorage(memoryId, region);
  }

  console.log('[SessionStorage] Using FileSessionStorage');
  return new FileSessionStorage();
}
