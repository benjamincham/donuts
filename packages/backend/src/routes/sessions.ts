/**
 * セッション管理API エンドポイント
 * AgentCore Memory のセッションとイベントを管理するAPI
 */

import { Router, Response } from 'express';
import { jwtAuthMiddleware, AuthenticatedRequest, getCurrentAuth } from '../middleware/auth.js';
import { createAgentCoreMemoryService } from '../services/agentcore-memory.js';
import { config } from '../config/index.js';

const router = Router();

/**
 * セッション一覧取得エンドポイント
 * GET /sessions
 * JWT認証必須 - ユーザーIDをactorIdとして使用
 */
router.get('/', jwtAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const auth = getCurrentAuth(req);
    const actorId = auth.userId;

    if (!actorId) {
      return res.status(400).json({
        error: 'Invalid authentication',
        message: 'ユーザーIDが取得できませんでした',
        requestId: auth.requestId,
      });
    }

    // AgentCore Memory ID が設定されているかチェック
    if (!config.agentcore.memoryId) {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'AgentCore Memory ID が設定されていません',
        requestId: auth.requestId,
      });
    }

    console.log(`📋 セッション一覧取得開始 (${auth.requestId}):`, {
      userId: actorId,
      username: auth.username,
    });

    const memoryService = createAgentCoreMemoryService();
    const sessions = await memoryService.listSessions(actorId);

    console.log(`✅ セッション一覧取得完了 (${auth.requestId}): ${sessions.length}件`);

    res.status(200).json({
      sessions,
      metadata: {
        requestId: auth.requestId,
        timestamp: new Date().toISOString(),
        actorId,
        count: sessions.length,
      },
    });
  } catch (error) {
    const auth = getCurrentAuth(req);
    console.error(`💥 セッション一覧取得エラー (${auth.requestId}):`, error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'セッション一覧の取得に失敗しました',
      requestId: auth.requestId,
    });
  }
});

/**
 * セッション会話履歴取得エンドポイント
 * GET /sessions/:sessionId/events
 * JWT認証必須 - ユーザーIDをactorIdとして使用
 */
router.get(
  '/:sessionId/events',
  jwtAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const auth = getCurrentAuth(req);
      const actorId = auth.userId;
      const { sessionId } = req.params;

      if (!actorId) {
        return res.status(400).json({
          error: 'Invalid authentication',
          message: 'ユーザーIDが取得できませんでした',
          requestId: auth.requestId,
        });
      }

      if (!sessionId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'セッションIDが指定されていません',
          requestId: auth.requestId,
        });
      }

      // AgentCore Memory ID が設定されているかチェック
      if (!config.agentcore.memoryId) {
        return res.status(500).json({
          error: 'Configuration Error',
          message: 'AgentCore Memory ID が設定されていません',
          requestId: auth.requestId,
        });
      }

      console.log(`💬 セッション会話履歴取得開始 (${auth.requestId}):`, {
        userId: actorId,
        username: auth.username,
        sessionId,
      });

      const memoryService = createAgentCoreMemoryService();
      const events = await memoryService.getSessionEvents(actorId, sessionId);

      console.log(`✅ セッション会話履歴取得完了 (${auth.requestId}): ${events.length}件`);

      res.status(200).json({
        events,
        metadata: {
          requestId: auth.requestId,
          timestamp: new Date().toISOString(),
          actorId,
          sessionId,
          count: events.length,
        },
      });
    } catch (error) {
      const auth = getCurrentAuth(req);
      console.error(`💥 セッション会話履歴取得エラー (${auth.requestId}):`, error);

      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'セッション会話履歴の取得に失敗しました',
        requestId: auth.requestId,
      });
    }
  }
);

export default router;
