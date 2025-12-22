/**
 * ファイルシステムベースのセッションストレージ実装
 * 開発・テスト用途。本番環境では DynamoDB や AgentCore Memory を推奨
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Message } from '@strands-agents/sdk';
import { SessionConfig, SessionStorage } from './types.js';
import { logger } from '../config/index.js';

/**
 * ローカルファイルシステムでセッション履歴を管理するクラス
 *
 * ファイル構造:
 * {storageDir}/
 * └── {actorId}/
 *     └── {sessionId}.json
 *
 * 例:
 * sessions/
 * ├── engineer_alice/
 * │   ├── python_study_20250817.json
 * │   └── aws_session_20250818.json
 * └── user_bob/
 *     └── general_chat_20250817.json
 */
export class FileSessionStorage implements SessionStorage {
  constructor(private readonly storageDir: string = './sessions') {}

  /**
   * 指定されたセッションの会話履歴を読み込む
   */
  async loadMessages(config: SessionConfig): Promise<Message[]> {
    const filePath = this.getFilePath(config);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const messages = JSON.parse(data) as Message[];

      logger.debug(
        `📖 セッション履歴を読み込み: ${config.actorId}/${config.sessionId} (${messages.length}件)`
      );
      return messages;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // ファイルが存在しない場合は空配列を返す（新規セッション）
        logger.debug(`📄 新規セッション: ${config.actorId}/${config.sessionId}`);
        return [];
      } else {
        logger.error(
          `❌ セッション履歴の読み込みエラー: ${config.actorId}/${config.sessionId}`,
          error
        );
        throw error;
      }
    }
  }

  /**
   * 指定されたセッションに会話履歴を保存する
   */
  async saveMessages(config: SessionConfig, messages: Message[]): Promise<void> {
    const actorDir = this.getActorDir(config.actorId);
    const filePath = this.getFilePath(config);

    try {
      // actor ディレクトリを作成
      await fs.mkdir(actorDir, { recursive: true });

      // メッセージをJSONファイルに保存（読みやすさのためインデント付き）
      await fs.writeFile(filePath, JSON.stringify(messages, null, 2), 'utf-8');

      logger.debug(
        `💾 セッション履歴を保存: ${config.actorId}/${config.sessionId} (${messages.length}件)`
      );
    } catch (error) {
      logger.error(`❌ セッション履歴の保存エラー: ${config.actorId}/${config.sessionId}`, error);
      throw error;
    }
  }

  /**
   * 指定されたセッションの履歴をクリアする
   * @param config セッション設定
   */
  async clearSession(config: SessionConfig): Promise<void> {
    const sessionPath = this.getFilePath(config);
    try {
      await fs.unlink(sessionPath);
      console.log(`[FileSessionStorage] Session cleared: ${sessionPath}`);
    } catch (error) {
      // ファイルが存在しない場合は無視
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`[FileSessionStorage] Error clearing session:`, error);
        throw error;
      }
    }
  }

  /**
   * 指定されたセッションに単一のメッセージを追加保存する
   * ストリーミング中のリアルタイム保存用
   * @param config セッション設定
   * @param message 追加するメッセージ
   */
  async appendMessage(config: SessionConfig, message: Message): Promise<void> {
    try {
      console.log(
        `[FileSessionStorage] Appending message for session: ${config.sessionId}, role: ${message.role}`
      );

      // 既存のメッセージを読み込み
      const existingMessages = await this.loadMessages(config);

      // 新しいメッセージを追加
      const updatedMessages = [...existingMessages, message];

      // 更新されたメッセージを保存
      await this.saveMessages(config, updatedMessages);
    } catch (error) {
      console.error(`[FileSessionStorage] Error appending message:`, error);
      throw error;
    }
  }

  /**
   * actor のディレクトリパスを取得
   */
  private getActorDir(actorId: string): string {
    const safeActorId = this.sanitizeId(actorId);
    return path.join(this.storageDir, safeActorId);
  }

  /**
   * セッションファイルのパスを取得
   */
  private getFilePath(config: SessionConfig): string {
    const safeActorId = this.sanitizeId(config.actorId);
    const safeSessionId = this.sanitizeId(config.sessionId);
    return path.join(this.storageDir, safeActorId, `${safeSessionId}.json`);
  }

  /**
   * ID文字列をファイルシステム安全な形式にサニタイズ
   * 許可文字: a-zA-Z0-9_-
   * その他は _ に置換
   */
  private sanitizeId(id: string): string {
    if (!id) {
      throw new Error('ID は空文字列にできません');
    }

    const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '_');

    // 長すぎる場合は制限（ファイルシステムの制限を考慮）
    const maxLength = 100;
    if (sanitized.length > maxLength) {
      return sanitized.substring(0, maxLength);
    }

    return sanitized;
  }
}
