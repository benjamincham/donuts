/**
 * Strands Message と AgentCore Memory PayloadType の変換ユーティリティ
 */
import { Message, TextBlock } from '@strands-agents/sdk';

/**
 * AgentCore Memory のConversational Payload型定義
 */
export interface ConversationalPayload {
  conversational: {
    content: { text: string };
    role: 'USER' | 'ASSISTANT';
  };
}

/**
 * Strands Message から AgentCore ConversationalPayload に変換
 * @param message Strands Message
 * @returns AgentCore ConversationalPayload
 */
export function messageToAgentCorePayload(message: Message): ConversationalPayload {
  // content 配列からテキストを抽出
  const textContent = extractTextFromMessage(message);

  // role を変換
  const agentCoreRole = message.role === 'user' ? 'USER' : 'ASSISTANT';

  return {
    conversational: {
      content: { text: textContent },
      role: agentCoreRole,
    },
  };
}

/**
 * AgentCore ConversationalPayload から Strands Message に変換
 * @param payload AgentCore ConversationalPayload
 * @returns Strands Message
 */
export function agentCorePayloadToMessage(payload: ConversationalPayload): Message {
  // role を変換
  const strandsRole = payload.conversational.role === 'USER' ? 'user' : 'assistant';

  // TextBlock を作成
  const textBlock = new TextBlock(payload.conversational.content.text);

  // Message を作成
  return new Message({
    role: strandsRole,
    content: [textBlock],
  });
}

/**
 * Strands Message からテキスト内容を抽出
 * @param message Strands Message
 * @returns テキスト内容
 */
function extractTextFromMessage(message: Message): string {
  if (!message.content || message.content.length === 0) {
    return '';
  }

  // 最初のテキスト要素を探す
  for (const contentBlock of message.content) {
    if (contentBlock.type === 'textBlock' && 'text' in contentBlock) {
      return contentBlock.text;
    }
  }

  return '';
}

/**
 * AgentCore Event から eventId を抽出
 * @param event AgentCore Event オブジェクト
 * @returns eventId
 */
export function extractEventId(event: { eventId?: string }): string {
  return event.eventId || '';
}

/**
 * 現在のタイムスタンプを取得（AgentCore Event用）
 * @returns Date オブジェクト
 */
export function getCurrentTimestamp(): Date {
  return new Date();
}
