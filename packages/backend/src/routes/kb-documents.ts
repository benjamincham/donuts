/**
 * Knowledge Base Documents API endpoints
 * API for managing documents in Knowledge Bases
 */

import { Router, Response } from 'express';
import { jwtAuthMiddleware, AuthenticatedRequest, getCurrentAuth } from '../middleware/auth.js';
import { createKBDocumentService, UploadDocumentInput } from '../services/kb-document-service.js';

const router = Router({ mergeParams: true });

/**
 * Document list retrieval endpoint
 * GET /knowledge-bases/:knowledgeBaseId/documents
 * JWT authentication required
 */
router.get('/', jwtAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
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

    console.log('📄 Document list retrieval started (%s):', auth.requestId, {
      userId,
      knowledgeBaseId,
    });

    const docService = createKBDocumentService();
    const result = await docService.listDocuments(userId, knowledgeBaseId);

    console.log(
      '✅ Document list retrieval completed (%s): %d items',
      auth.requestId,
      result.totalCount
    );

    res.status(200).json({
      documents: result.documents,
      totalCount: result.totalCount,
      metadata: {
        requestId: auth.requestId,
        timestamp: new Date().toISOString(),
        userId,
        knowledgeBaseId,
      },
    });
  } catch (error) {
    const auth = getCurrentAuth(req);
    console.error('💥 Document list retrieval error (%s):', auth.requestId, error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to retrieve document list',
      requestId: auth.requestId,
    });
  }
});

/**
 * Get upload URL endpoint
 * POST /knowledge-bases/:knowledgeBaseId/documents/upload-url
 * JWT authentication required
 */
router.post('/upload-url', jwtAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const auth = getCurrentAuth(req);
    const userId = auth.userId;
    const { knowledgeBaseId } = req.params;
    const input: UploadDocumentInput = req.body;

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

    // Validation
    if (!input.fileName || !input.contentType) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Required fields are missing (fileName, contentType)',
        requestId: auth.requestId,
      });
    }

    const docService = createKBDocumentService();

    // Validate file type
    if (!docService.isValidFileType(input.fileName)) {
      return res.status(400).json({
        error: 'Invalid file type',
        message:
          'File type not supported. Supported types: PDF, TXT, MD, DOC, DOCX, XLS, XLSX, PPT, PPTX, HTML, JSON, CSV, XML',
        requestId: auth.requestId,
      });
    }

    // Validate file size
    const maxSize = docService.getMaxFileSize();
    if (input.size > maxSize) {
      return res.status(400).json({
        error: 'File too large',
        message: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
        requestId: auth.requestId,
      });
    }

    console.log('⬆️ Generate upload URL started (%s):', auth.requestId, {
      userId,
      knowledgeBaseId,
      fileName: input.fileName,
    });

    const result = await docService.generateUploadUrl(userId, knowledgeBaseId, input);

    console.log('✅ Upload URL generated (%s): documentId=%s', auth.requestId, result.documentId);

    res.status(200).json({
      uploadUrl: result.uploadUrl,
      documentId: result.documentId,
      s3Key: result.s3Key,
      expiresIn: result.expiresIn,
      metadata: {
        requestId: auth.requestId,
        timestamp: new Date().toISOString(),
        userId,
        knowledgeBaseId,
      },
    });
  } catch (error) {
    const auth = getCurrentAuth(req);
    console.error('💥 Generate upload URL error (%s):', auth.requestId, error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to generate upload URL',
      requestId: auth.requestId,
    });
  }
});

/**
 * Specific document retrieval endpoint
 * GET /knowledge-bases/:knowledgeBaseId/documents/:documentId
 * JWT authentication required
 */
router.get('/:documentId', jwtAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const auth = getCurrentAuth(req);
    const userId = auth.userId;
    const { knowledgeBaseId, documentId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'Invalid authentication',
        message: 'Failed to retrieve user ID',
        requestId: auth.requestId,
      });
    }

    if (!knowledgeBaseId || !documentId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Knowledge Base ID or Document ID is not specified',
        requestId: auth.requestId,
      });
    }

    const docService = createKBDocumentService();
    const document = await docService.getDocument(userId, knowledgeBaseId, documentId);

    if (!document) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Document not found',
        requestId: auth.requestId,
      });
    }

    res.status(200).json({
      document,
      metadata: {
        requestId: auth.requestId,
        timestamp: new Date().toISOString(),
        userId,
        knowledgeBaseId,
      },
    });
  } catch (error) {
    const auth = getCurrentAuth(req);
    console.error('💥 Document retrieval error (%s):', auth.requestId, error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to retrieve document',
      requestId: auth.requestId,
    });
  }
});

/**
 * Document deletion endpoint
 * DELETE /knowledge-bases/:knowledgeBaseId/documents/:documentId
 * JWT authentication required
 */
router.delete(
  '/:documentId',
  jwtAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const auth = getCurrentAuth(req);
      const userId = auth.userId;
      const { knowledgeBaseId, documentId } = req.params;

      if (!userId) {
        return res.status(400).json({
          error: 'Invalid authentication',
          message: 'Failed to retrieve user ID',
          requestId: auth.requestId,
        });
      }

      if (!knowledgeBaseId || !documentId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Knowledge Base ID or Document ID is not specified',
          requestId: auth.requestId,
        });
      }

      console.log('🗑️ Document deletion started (%s):', auth.requestId, {
        userId,
        knowledgeBaseId,
        documentId,
      });

      const docService = createKBDocumentService();
      await docService.deleteDocument(userId, knowledgeBaseId, documentId);

      console.log('✅ Document deletion completed (%s): %s', auth.requestId, documentId);

      res.status(200).json({
        success: true,
        metadata: {
          requestId: auth.requestId,
          timestamp: new Date().toISOString(),
          userId,
          knowledgeBaseId,
        },
      });
    } catch (error) {
      const auth = getCurrentAuth(req);
      console.error('💥 Document deletion error (%s):', auth.requestId, error);

      if (error instanceof Error && error.message === 'Document not found') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Document not found',
          requestId: auth.requestId,
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to delete document',
        requestId: auth.requestId,
      });
    }
  }
);

/**
 * Get download URL endpoint
 * GET /knowledge-bases/:knowledgeBaseId/documents/:documentId/download-url
 * JWT authentication required
 */
router.get(
  '/:documentId/download-url',
  jwtAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const auth = getCurrentAuth(req);
      const userId = auth.userId;
      const { knowledgeBaseId, documentId } = req.params;

      if (!userId) {
        return res.status(400).json({
          error: 'Invalid authentication',
          message: 'Failed to retrieve user ID',
          requestId: auth.requestId,
        });
      }

      if (!knowledgeBaseId || !documentId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Knowledge Base ID or Document ID is not specified',
          requestId: auth.requestId,
        });
      }

      const docService = createKBDocumentService();
      const downloadUrl = await docService.generateDownloadUrl(userId, knowledgeBaseId, documentId);

      res.status(200).json({
        downloadUrl,
        expiresIn: 300,
        metadata: {
          requestId: auth.requestId,
          timestamp: new Date().toISOString(),
          userId,
          knowledgeBaseId,
        },
      });
    } catch (error) {
      const auth = getCurrentAuth(req);
      console.error('💥 Generate download URL error (%s):', auth.requestId, error);

      if (error instanceof Error && error.message === 'Document not found') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Document not found',
          requestId: auth.requestId,
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to generate download URL',
        requestId: auth.requestId,
      });
    }
  }
);

export default router;
