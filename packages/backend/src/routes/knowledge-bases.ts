/**
 * Knowledge Base API endpoints
 * API for managing user Knowledge Bases
 */

import { Router, Response } from 'express';
import { jwtAuthMiddleware, AuthenticatedRequest, getCurrentAuth } from '../middleware/auth.js';
import {
  createKnowledgeBaseService,
  CreateKnowledgeBaseInput,
  UpdateKnowledgeBaseInput,
} from '../services/knowledge-base-service.js';

const router = Router();

/**
 * Knowledge base list retrieval endpoint
 * GET /knowledge-bases
 * JWT authentication required
 */
router.get('/', jwtAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const auth = getCurrentAuth(req);
    const userId = auth.userId;

    if (!userId) {
      return res.status(400).json({
        error: 'Invalid authentication',
        message: 'Failed to retrieve user ID',
        requestId: auth.requestId,
      });
    }

    console.log('📚 Knowledge base list retrieval started (%s):', auth.requestId, {
      userId,
      username: auth.username,
    });

    const kbService = createKnowledgeBaseService();
    const knowledgeBases = await kbService.listKnowledgeBases(userId);

    console.log(
      '✅ Knowledge base list retrieval completed (%s): %d items',
      auth.requestId,
      knowledgeBases.length
    );

    res.status(200).json({
      knowledgeBases,
      metadata: {
        requestId: auth.requestId,
        timestamp: new Date().toISOString(),
        userId,
        count: knowledgeBases.length,
      },
    });
  } catch (error) {
    const auth = getCurrentAuth(req);
    console.error('💥 Knowledge base list retrieval error (%s):', auth.requestId, error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to retrieve knowledge base list',
      requestId: auth.requestId,
    });
  }
});

/**
 * Specific Knowledge base retrieval endpoint
 * GET /knowledge-bases/:knowledgeBaseId
 * JWT authentication required
 */
router.get(
  '/:knowledgeBaseId',
  jwtAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const auth = getCurrentAuth(req);
      const userId = auth.userId;
      const { knowledgeBaseId } = req.params;

      if (!userId) {
        return res.status(400).json({
          error: 'Invalid authentication',
          message: 'Failed to retrieve user ID',
          requestId: auth.requestId,
        });
      }

      if (!knowledgeBaseId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Knowledge Base ID is not specified',
          requestId: auth.requestId,
        });
      }

      console.log('🔍 Knowledge base retrieval started (%s):', auth.requestId, {
        userId,
        knowledgeBaseId,
      });

      const kbService = createKnowledgeBaseService();
      const knowledgeBase = await kbService.getKnowledgeBase(userId, knowledgeBaseId);

      if (!knowledgeBase) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Knowledge base not found',
          requestId: auth.requestId,
        });
      }

      console.log(
        '✅ Knowledge base retrieval completed (%s): %s',
        auth.requestId,
        knowledgeBase.name
      );

      res.status(200).json({
        knowledgeBase,
        metadata: {
          requestId: auth.requestId,
          timestamp: new Date().toISOString(),
          userId,
        },
      });
    } catch (error) {
      const auth = getCurrentAuth(req);
      console.error('💥 Knowledge base retrieval error (%s):', auth.requestId, error);

      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to retrieve knowledge base',
        requestId: auth.requestId,
      });
    }
  }
);

/**
 * Knowledge base creation endpoint
 * POST /knowledge-bases
 * JWT authentication required
 */
router.post('/', jwtAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const auth = getCurrentAuth(req);
    const userId = auth.userId;
    const input: CreateKnowledgeBaseInput = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Invalid authentication',
        message: 'Failed to retrieve user ID',
        requestId: auth.requestId,
      });
    }

    // Validation
    if (!input.name || !input.description) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Required fields are missing (name, description)',
        requestId: auth.requestId,
      });
    }

    console.log('➕ Knowledge base creation started (%s):', auth.requestId, {
      userId,
      kbName: input.name,
    });

    const kbService = createKnowledgeBaseService();
    const knowledgeBase = await kbService.createKnowledgeBase(userId, input);

    console.log(
      '✅ Knowledge base creation completed (%s): %s',
      auth.requestId,
      knowledgeBase.knowledgeBaseId
    );

    res.status(201).json({
      knowledgeBase,
      metadata: {
        requestId: auth.requestId,
        timestamp: new Date().toISOString(),
        userId,
      },
    });
  } catch (error) {
    const auth = getCurrentAuth(req);
    console.error('💥 Knowledge base creation error (%s):', auth.requestId, error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to create knowledge base',
      requestId: auth.requestId,
    });
  }
});

/**
 * Knowledge base update endpoint
 * PUT /knowledge-bases/:knowledgeBaseId
 * JWT authentication required
 */
router.put(
  '/:knowledgeBaseId',
  jwtAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const auth = getCurrentAuth(req);
      const userId = auth.userId;
      const { knowledgeBaseId } = req.params;
      const input: Partial<CreateKnowledgeBaseInput> = req.body;

      if (!userId) {
        return res.status(400).json({
          error: 'Invalid authentication',
          message: 'Failed to retrieve user ID',
          requestId: auth.requestId,
        });
      }

      if (!knowledgeBaseId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Knowledge Base ID is not specified',
          requestId: auth.requestId,
        });
      }

      console.log('📝 Knowledge base update started (%s):', auth.requestId, {
        userId,
        knowledgeBaseId,
      });

      const kbService = createKnowledgeBaseService();
      const updateInput: UpdateKnowledgeBaseInput = {
        knowledgeBaseId,
        ...input,
      };
      const knowledgeBase = await kbService.updateKnowledgeBase(userId, updateInput);

      console.log(
        '✅ Knowledge base update completed (%s): %s',
        auth.requestId,
        knowledgeBase.name
      );

      res.status(200).json({
        knowledgeBase,
        metadata: {
          requestId: auth.requestId,
          timestamp: new Date().toISOString(),
          userId,
        },
      });
    } catch (error) {
      const auth = getCurrentAuth(req);
      console.error('💥 Knowledge base update error (%s):', auth.requestId, error);

      if (error instanceof Error && error.message === 'Knowledge base not found') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Knowledge base not found',
          requestId: auth.requestId,
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to update knowledge base',
        requestId: auth.requestId,
      });
    }
  }
);

/**
 * Knowledge base deletion endpoint
 * DELETE /knowledge-bases/:knowledgeBaseId
 * JWT authentication required
 */
router.delete(
  '/:knowledgeBaseId',
  jwtAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const auth = getCurrentAuth(req);
      const userId = auth.userId;
      const { knowledgeBaseId } = req.params;

      if (!userId) {
        return res.status(400).json({
          error: 'Invalid authentication',
          message: 'Failed to retrieve user ID',
          requestId: auth.requestId,
        });
      }

      if (!knowledgeBaseId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Knowledge Base ID is not specified',
          requestId: auth.requestId,
        });
      }

      console.log('🗑️ Knowledge base deletion started (%s):', auth.requestId, {
        userId,
        knowledgeBaseId,
      });

      const kbService = createKnowledgeBaseService();
      await kbService.deleteKnowledgeBase(userId, knowledgeBaseId);

      console.log('✅ Knowledge base deletion completed (%s): %s', auth.requestId, knowledgeBaseId);

      res.status(200).json({
        success: true,
        metadata: {
          requestId: auth.requestId,
          timestamp: new Date().toISOString(),
          userId,
        },
      });
    } catch (error) {
      const auth = getCurrentAuth(req);
      console.error('💥 Knowledge base deletion error (%s):', auth.requestId, error);

      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to delete knowledge base',
        requestId: auth.requestId,
      });
    }
  }
);

/**
 * Knowledge base sync endpoint
 * POST /knowledge-bases/:knowledgeBaseId/sync
 * JWT authentication required
 */
router.post(
  '/:knowledgeBaseId/sync',
  jwtAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const auth = getCurrentAuth(req);
      const userId = auth.userId;
      const { knowledgeBaseId } = req.params;

      if (!userId) {
        return res.status(400).json({
          error: 'Invalid authentication',
          message: 'Failed to retrieve user ID',
          requestId: auth.requestId,
        });
      }

      if (!knowledgeBaseId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Knowledge Base ID is not specified',
          requestId: auth.requestId,
        });
      }

      console.log('🔄 Knowledge base sync started (%s):', auth.requestId, {
        userId,
        knowledgeBaseId,
      });

      const kbService = createKnowledgeBaseService();
      const result = await kbService.syncKnowledgeBase(userId, knowledgeBaseId);

      console.log(
        '✅ Knowledge base sync started (%s): ingestionJobId=%s',
        auth.requestId,
        result.ingestionJobId
      );

      res.status(200).json({
        sync: result,
        metadata: {
          requestId: auth.requestId,
          timestamp: new Date().toISOString(),
          userId,
        },
      });
    } catch (error) {
      const auth = getCurrentAuth(req);
      console.error('💥 Knowledge base sync error (%s):', auth.requestId, error);

      if (error instanceof Error && error.message === 'Knowledge base not found') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Knowledge base not found',
          requestId: auth.requestId,
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to sync knowledge base',
        requestId: auth.requestId,
      });
    }
  }
);

/**
 * Knowledge base sync status endpoint
 * GET /knowledge-bases/:knowledgeBaseId/sync-status
 * JWT authentication required
 */
router.get(
  '/:knowledgeBaseId/sync-status',
  jwtAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const auth = getCurrentAuth(req);
      const userId = auth.userId;
      const { knowledgeBaseId } = req.params;

      if (!userId) {
        return res.status(400).json({
          error: 'Invalid authentication',
          message: 'Failed to retrieve user ID',
          requestId: auth.requestId,
        });
      }

      if (!knowledgeBaseId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Knowledge Base ID is not specified',
          requestId: auth.requestId,
        });
      }

      const kbService = createKnowledgeBaseService();
      const status = await kbService.getSyncStatus(userId, knowledgeBaseId);

      res.status(200).json({
        status,
        metadata: {
          requestId: auth.requestId,
          timestamp: new Date().toISOString(),
          userId,
        },
      });
    } catch (error) {
      const auth = getCurrentAuth(req);
      console.error('💥 Knowledge base sync status error (%s):', auth.requestId, error);

      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get sync status',
        requestId: auth.requestId,
      });
    }
  }
);

export default router;
