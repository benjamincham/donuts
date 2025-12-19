import React, { useState, useRef, useEffect } from 'react';
import { ZodError } from 'zod';
import { Send, Loader2 } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { chatPromptSchema } from '../schemas/chat';

export const MessageInput: React.FC = () => {
  const { sendPrompt, isLoading, clearError } = useChatStore();
  const [input, setInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // テキストエリアの自動リサイズ
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    // バリデーション
    try {
      chatPromptSchema.parse({ prompt: value });
      setValidationError(null);
    } catch (err) {
      if (err instanceof ZodError && err.issues?.[0]?.message) {
        setValidationError(err.issues[0].message);
      }
    }

    // チャットストアのエラーをクリア
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) {
      return;
    }

    try {
      // バリデーション
      const validated = chatPromptSchema.parse({ prompt: input.trim() });

      // メッセージ送信
      await sendPrompt(validated.prompt);

      // 入力フィールドをクリア
      setInput('');
      setValidationError(null);
    } catch (err) {
      if (err instanceof ZodError && err.issues?.[0]?.message) {
        setValidationError(err.issues[0].message);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift + Enter で改行、Enter で送信（IME変換中は除く）
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex items-stretch space-x-4">
          {/* テキスト入力エリア */}
          <div className="flex-1">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力してください... (Shift+Enter で改行、Enter で送信)"
                className={`input-field min-h-[44px] max-h-[200px] resize-none ${
                  validationError ? 'border-red-300 focus:ring-red-300' : ''
                }`}
                disabled={isLoading}
                rows={1}
                style={{ height: 'auto' }}
              />

              {/* 文字数カウンター */}
              <div className="absolute right-3 bottom-3 text-xs text-gray-400">
                {input.length}/10000
              </div>
            </div>

            {/* バリデーションエラー表示 */}
            {validationError && <p className="mt-2 text-sm text-red-600">{validationError}</p>}

            {/* ヘルプテキスト */}
            <p className="mt-2 text-xs text-gray-500">Shift + Enter で改行、Enter で送信</p>
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !!validationError}
            className="button-primary inline-flex items-center gap-2 min-w-[100px] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ height: '44px' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                送信中...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 shrink-0" />
                送信
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
