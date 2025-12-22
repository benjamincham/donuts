/**
 * セッション永続化フック
 * Agent の実行前後で会話履歴を自動保存する HookProvider
 */

import { HookProvider, HookRegistry, AfterInvocationEvent } from '@strands-agents/sdk';
import { SessionConfig, SessionStorage } from './types.js';
import { logger } from '../config/index.js';

/**
 * Agent のライフサイクルイベントに応答してセッション履歴を永続化するフック
 *
 * 使用方法:
 * const hook = new SessionPersistenceHook(storage, { actorId: "user123", sessionId: "session456" });
 * const agent = new Agent({ hooks: [hook] });
 */
export class SessionPersistenceHook implements HookProvider {
  constructor(
    private readonly storage: SessionStorage,
    private readonly sessionConfig: SessionConfig
  ) {}

  /**
   * フックコールバックをレジストリに登録
   */
  registerCallbacks(registry: HookRegistry): void {
    // Agent 実行完了後に履歴を保存
    registry.addCallback(AfterInvocationEvent, (event) => this.onAfterInvocation(event));
  }

  /**
   * Agent 実行完了後のイベントハンドラ
   * 会話履歴をストレージに保存する
   * リアルタイム保存されていない場合のフォールバック
   */
  private async onAfterInvocation(event: AfterInvocationEvent): Promise<void> {
    try {
      const { actorId, sessionId } = this.sessionConfig;
      const messages = event.agent.messages;

      logger.debug(
        `🔍 AfterInvocation: Agent messages=${messages.length}, checking for unsaved messages`
      );

      // 会話履歴をストレージに保存（既に保存済みの場合は重複を避ける）
      await this.storage.saveMessages(this.sessionConfig, messages);

      logger.debug(
        `💾 セッション履歴を自動保存完了 (フォールバック): ${actorId}/${sessionId} (${messages.length}件)`
      );
    } catch (error) {
      // エラーが発生しても Agent の実行を止めないように警告レベルでログ
      logger.warn(
        `⚠️  セッション履歴の自動保存に失敗: ${this.sessionConfig.actorId}/${this.sessionConfig.sessionId}`,
        error
      );
    }
  }
}
