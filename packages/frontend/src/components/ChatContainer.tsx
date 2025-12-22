import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import { useSelectedAgent } from '../stores/agentStore';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { AgentSelectorModal } from './AgentSelectorModal';
import type { Agent } from '../types/agent';

export const ChatContainer: React.FC = () => {
  const selectedAgent = useSelectedAgent();
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [selectedScenarioPrompt, setSelectedScenarioPrompt] = useState<string | null>(null);

  // シナリオクリック処理
  const handleScenarioClick = (prompt: string) => {
    setSelectedScenarioPrompt(prompt);
  };

  // シナリオプロンプト取得関数（MessageInputに渡す）
  const getScenarioPrompt = () => {
    const prompt = selectedScenarioPrompt;
    if (prompt) {
      setSelectedScenarioPrompt(null); // 一度だけ使用
    }
    return prompt;
  };

  // Agent選択処理
  const handleAgentSelect = (agent: Agent | null) => {
    // Agent選択は AgentStore で管理されているのでここでは何もしない
    console.log('Agent selected:', agent?.name || 'None');
  };

  return (
    <div className="chat-container">
      {/* ヘッダー */}
      <header className="flex items-center justify-between p-4 bg-white">
        <div className="flex items-center">
          <div>
            <button
              onClick={() => setIsAgentModalOpen(true)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <Bot className="w-6 h-6 text-gray-700" />
              <h1 className="text-lg font-semibold text-gray-900">
                {selectedAgent ? selectedAgent.name : '汎用アシスタント'}
              </h1>
            </button>
          </div>
        </div>
      </header>

      {/* メッセージリスト */}
      <MessageList onScenarioClick={handleScenarioClick} />

      {/* メッセージ入力 */}
      <MessageInput getScenarioPrompt={getScenarioPrompt} />

      {/* Agent選択モーダル */}
      <AgentSelectorModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        onAgentSelect={handleAgentSelect}
      />
    </div>
  );
};
