/**
 * Session persistence hook
 * HookProvider that automatically saves conversation history before and after Agent execution
 * Also manages session metadata in DynamoDB
 */

import {
  HookProvider,
  HookRegistry,
  AfterInvocationEvent,
  MessageAddedEvent,
  Message,
} from '@strands-agents/sdk';
import { SessionConfig, SessionStorage } from './types.js';
import { getSessionsService } from '../services/sessions-service.js';
import { logger } from '../config/index.js';

/**
 * Extract title from first user message (truncate to max 50 chars)
 */
function extractTitleFromMessage(message: Message): string {
  const maxLength = 50;

  if (message.role !== 'user') {
    return 'Session';
  }

  // Extract text from message content
  const content = message.content;
  if (!content || !Array.isArray(content)) {
    return 'Session';
  }

  for (const block of content) {
    if (block && typeof block === 'object' && 'text' in block && typeof block.text === 'string') {
      const text = block.text.trim();
      if (text) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
      }
    }
  }

  return 'Session';
}

/**
 * Hook that persists session history in response to Agent lifecycle events
 * Also creates/updates session metadata in DynamoDB
 *
 * Usage:
 * const hook = new SessionPersistenceHook(storage, { actorId: "user123", sessionId: "session456" });
 * const agent = new Agent({ hooks: [hook] });
 */
export class SessionPersistenceHook implements HookProvider {
  private isFirstUserMessage = true;
  private agentId?: string;

  constructor(
    private readonly storage: SessionStorage,
    private readonly sessionConfig: SessionConfig,
    agentId?: string
  ) {
    this.agentId = agentId;
  }

  /**
   * Register hook callbacks to registry
   */
  registerCallbacks(registry: HookRegistry): void {
    // Handle message added events for DynamoDB session management
    registry.addCallback(MessageAddedEvent, (event) => this.onMessageAdded(event));

    // Save history after Agent execution completes
    registry.addCallback(AfterInvocationEvent, (event) => this.onAfterInvocation(event));
  }

  /**
   * Event handler when a message is added
   * Creates session in DynamoDB on first user message, updates timestamp on subsequent messages
   */
  private async onMessageAdded(event: MessageAddedEvent): Promise<void> {
    const message = event.message;
    const { actorId, sessionId } = this.sessionConfig;

    // Only process user messages for session management
    if (message.role !== 'user') {
      return;
    }

    const sessionsService = getSessionsService();
    if (!sessionsService.isConfigured()) {
      logger.debug(
        '[SessionPersistenceHook] SessionsService not configured, skipping DynamoDB operation'
      );
      return;
    }

    try {
      if (this.isFirstUserMessage) {
        // Check if session already exists
        const exists = await sessionsService.sessionExists(actorId, sessionId);

        if (!exists) {
          // New session - create in DynamoDB
          const title = extractTitleFromMessage(message);
          await sessionsService.createSession({
            userId: actorId,
            sessionId,
            title,
            agentId: this.agentId,
          });
          logger.info('[SessionPersistenceHook] Created new session in DynamoDB:', {
            userId: actorId,
            sessionId,
            title,
          });
        } else {
          // Existing session - update timestamp
          await sessionsService.updateSessionTimestamp(actorId, sessionId);
          logger.debug('[SessionPersistenceHook] Updated existing session timestamp:', {
            userId: actorId,
            sessionId,
          });
        }

        this.isFirstUserMessage = false;
      } else {
        // Subsequent messages - just update timestamp
        await sessionsService.updateSessionTimestamp(actorId, sessionId);
        logger.debug('[SessionPersistenceHook] Updated session timestamp:', {
          userId: actorId,
          sessionId,
        });
      }
    } catch (error) {
      // Log warning but don't stop execution
      logger.warn('[SessionPersistenceHook] DynamoDB operation failed:', {
        userId: actorId,
        sessionId,
        error,
      });
    }
  }

  /**
   * Event handler after Agent execution completes
   * Save conversation history to storage
   * Fallback for when real-time saving is not performed
   */
  private async onAfterInvocation(event: AfterInvocationEvent): Promise<void> {
    try {
      const { actorId, sessionId } = this.sessionConfig;
      const messages = event.agent.messages;

      logger.debug(
        `🔍 AfterInvocation triggered: Agent messages=${messages.length}, checking for unsaved messages`,
        { actorId, sessionId }
      );

      // Save conversation history to storage (avoid duplicates if already saved)
      await this.storage.saveMessages(this.sessionConfig, messages);

      logger.debug(
        `💾 Session history auto-save completed (fallback): ${actorId}/${sessionId} (${messages.length} items)`
      );
    } catch (error) {
      // Log at warning level to not stop Agent execution even if error occurs
      logger.warn(
        `⚠️  Session history auto-save failed: ${this.sessionConfig.actorId}/${this.sessionConfig.sessionId}`,
        error
      );
    }
  }
}
