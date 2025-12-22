import { useState } from 'react';
import { Settings, Brain, HelpCircle } from 'lucide-react';
import { useMemoryStore } from '../stores/memoryStore';
import { MemoryManagementModal } from '../components/MemoryManagementModal';

/**
 * 設定ページ
 * 各種設定を管理するページ（今後設定項目を追加予定）
 */
export function SettingsPage() {
  const { isMemoryEnabled, setMemoryEnabled } = useMemoryStore();
  const [showMemoryModal, setShowMemoryModal] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-gray-700" />
          <h1 className="text-xl font-semibold text-gray-900">設定</h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* メモリ管理セクション */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">メモリ</h2>
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </div>
            <button
              onClick={() => setShowMemoryModal(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              管理する
            </button>
          </div>

          <div className="flex items-center justify-between py-4">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-1">保存されたメモリを参照する</h3>
              <p className="text-sm text-gray-600">
                エージェントが回答するときにメモリを保存して使用できるようにします。
              </p>
            </div>
            <div className="ml-4">
              {/* カスタムトグルスイッチ */}
              <button
                onClick={() => setMemoryEnabled(!isMemoryEnabled)}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                  transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
                  ${isMemoryEnabled ? 'bg-blue-600' : 'bg-gray-200'}
                `}
                role="switch"
                aria-checked={isMemoryEnabled}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                    transition duration-200 ease-in-out
                    ${isMemoryEnabled ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 他の設定項目（準備中） */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-4">今後追加予定の設定項目:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-300 rounded-full flex-shrink-0"></div>
              テーマ設定（ダークモード/ライトモード）
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-300 rounded-full flex-shrink-0"></div>
              デフォルトのLLMモデル選択
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-300 rounded-full flex-shrink-0"></div>
              通知設定
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-300 rounded-full flex-shrink-0"></div>
              アカウント設定
            </li>
          </ul>
        </div>

        {/* メモリ管理モーダル */}
        <MemoryManagementModal isOpen={showMemoryModal} onClose={() => setShowMemoryModal(false)} />
      </main>
    </div>
  );
}
