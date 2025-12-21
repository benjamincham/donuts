/**
 * Home ページコンポーネント
 * アプリケーションの紹介とメインナビゲーション
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Donut, MessageCircle } from 'lucide-react';
import { SessionSidebar } from '../components/SessionSidebar';
import { useUIStore } from '../stores/uiStore';

export function HomePage() {
  const navigate = useNavigate();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();

  // レスポンシブ対応: 768px未満でサイドバーを自動的に閉じる
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');

    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        // モバイル画面: サイドバーを閉じる
        setSidebarOpen(false);
      } else {
        // デスクトップ画面: サイドバーを開く
        setSidebarOpen(true);
      }
    };

    // 初回チェック
    if (mediaQuery.matches) {
      setSidebarOpen(false);
    }

    // リスナー登録
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, [setSidebarOpen]);

  return (
    <div className="flex h-full w-full">
      {/* サイドバー - 常に表示、幅のみ切り替え */}
      <div
        className={`
          transition-all duration-300 ease-in-out flex-shrink-0
          ${isSidebarOpen ? 'w-80' : 'w-16'}
        `}
      >
        <SessionSidebar />
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-2xl space-y-8">
            {/* メインアイコン */}
            <div className="relative">
              <div className="absolute inset-0 bg-amber-200 rounded-full blur-3xl opacity-30 scale-150"></div>
              <div className="relative bg-white rounded-full p-8 shadow-xl border border-amber-100">
                <Donut className="w-24 h-24 text-amber-600 mx-auto" />
              </div>
            </div>

            {/* タイトルと説明 */}
            <div className="space-y-4">
              <h1 className="text-6xl font-extrabold text-amber-900 tracking-tight">Donuts</h1>
              <p className="text-xl text-amber-700 font-medium leading-relaxed">
                あなただけの AI チャットアシスタント
              </p>
              <p className="text-lg text-amber-600 leading-relaxed max-w-lg mx-auto">
                質問、相談、アイデアの整理まで。
                <br />
                甘いドーナツのように、いつでもあなたの傍にいます。
              </p>
            </div>

            {/* CTA ボタン */}
            <div className="pt-8">
              <button
                onClick={() => navigate('/chat')}
                className="group px-12 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full text-lg font-semibold transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                <span className="flex items-center gap-2">
                  今すぐ始める
                  <MessageCircle className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </div>
          </div>
        </main>

        {/* フッター */}
        <footer className="p-6 text-center">
          <p className="text-sm text-gray-500">
            © 2024 Donuts AI Assistant. Made with ❤️ and a lot of coffee.
          </p>
        </footer>
      </div>
    </div>
  );
}
