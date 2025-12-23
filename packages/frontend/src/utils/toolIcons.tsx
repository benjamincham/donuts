/**
 * ツールアイコン選択ユーティリティ
 * ツール名に基づいて適切なアイコンを返します
 */

import {
  Search,
  Settings,
  Zap,
  Code,
  Terminal,
  Globe,
  FileOutput,
  FileText,
  Database,
  Link,
  Image,
  MessageSquare,
  Mail,
  Calendar,
  User,
  Calculator,
  Cloud,
  Volume2,
  Play,
  MapPin,
  Sparkles,
  Trash2,
  List,
} from 'lucide-react';

/**
 * ツール名に基づいたアイコンを選択
 * @param toolName ツール名
 * @param className アイコンのクラス名（デフォルト: "w-4 h-4"）
 * @returns React.ReactNode
 */
export const getToolIcon = (toolName: string, className: string = 'w-4 h-4') => {
  const name = toolName.toLowerCase();

  // Web検索
  if (name.includes('search')) return <Search className={className} />;

  // 抽出・パース
  if (name.includes('extract') || name.includes('parse'))
    return <FileOutput className={className} />;

  // クローリング・スクレイピング
  if (name.includes('crawl') || name.includes('scrape')) return <Globe className={className} />;

  // コマンド実行・ターミナル
  if (
    name.includes('command') ||
    name.includes('terminal') ||
    name.includes('execute') ||
    name.includes('shell')
  )
    return <Terminal className={className} />;

  // ファイル操作
  if (name.includes('file') || name.includes('read') || name.includes('write'))
    return <FileText className={className} />;

  // データベース
  if (name.includes('database') || name.includes('db') || name.includes('sql'))
    return <Database className={className} />;

  // Web・API
  if (
    name.includes('http') ||
    name.includes('api') ||
    name.includes('fetch') ||
    name.includes('web')
  )
    return <Link className={className} />;

  // 画像
  if (name.includes('image') || name.includes('picture') || name.includes('photo'))
    return <Image className={className} />;

  // テキスト・チャット・メッセージ
  if (name.includes('text') || name.includes('chat') || name.includes('message'))
    return <MessageSquare className={className} />;

  // メール
  if (name.includes('email') || name.includes('mail')) return <Mail className={className} />;

  // カレンダー・日付・スケジュール
  if (name.includes('calendar') || name.includes('date') || name.includes('schedule'))
    return <Calendar className={className} />;

  // ユーザー・プロフィール・アカウント
  if (name.includes('user') || name.includes('profile') || name.includes('account'))
    return <User className={className} />;

  // 計算・数学
  if (name.includes('math') || name.includes('calculate') || name.includes('compute'))
    return <Calculator className={className} />;

  // 天気・気象
  if (name.includes('weather') || name.includes('forecast')) return <Cloud className={className} />;

  // 音声・音楽
  if (name.includes('audio') || name.includes('sound') || name.includes('music'))
    return <Volume2 className={className} />;

  // 動画・メディア
  if (name.includes('video') || name.includes('media')) return <Play className={className} />;

  // 位置情報・マップ
  if (name.includes('map') || name.includes('location') || name.includes('geo'))
    return <MapPin className={className} />;

  // 生成・作成
  if (name.includes('generate') || name.includes('create'))
    return <Sparkles className={className} />;

  // 削除・除去
  if (name.includes('delete') || name.includes('remove')) return <Trash2 className={className} />;

  // リスト・列挙
  if (name.includes('list') || name.includes('enum')) return <List className={className} />;

  // エコー・ping・テスト
  if (name.includes('echo') || name.includes('ping') || name.includes('test'))
    return <Zap className={className} />;

  // コード・スクリプト・コンパイル
  if (name.includes('code') || name.includes('script') || name.includes('compile'))
    return <Code className={className} />;

  // デフォルト
  return <Settings className={className} />;
};

/**
 * ツール名に対応するアイコンのマッピング情報を取得
 * デバッグやドキュメント生成に使用
 */
export const getToolIconInfo = (toolName: string) => {
  const name = toolName.toLowerCase();

  if (name.includes('search')) return { icon: 'Search', category: 'Web検索' };
  if (name.includes('extract') || name.includes('parse'))
    return { icon: 'FileOutput', category: '抽出・パース' };
  if (name.includes('crawl') || name.includes('scrape'))
    return { icon: 'Globe', category: 'クローリング・スクレイピング' };
  if (
    name.includes('command') ||
    name.includes('terminal') ||
    name.includes('execute') ||
    name.includes('shell')
  )
    return { icon: 'Terminal', category: 'コマンド実行・ターミナル' };
  if (name.includes('file') || name.includes('read') || name.includes('write'))
    return { icon: 'FileText', category: 'ファイル操作' };
  if (name.includes('database') || name.includes('db') || name.includes('sql'))
    return { icon: 'Database', category: 'データベース' };
  if (
    name.includes('http') ||
    name.includes('api') ||
    name.includes('fetch') ||
    name.includes('web')
  )
    return { icon: 'Link', category: 'Web・API' };
  if (name.includes('image') || name.includes('picture') || name.includes('photo'))
    return { icon: 'Image', category: '画像' };
  if (name.includes('text') || name.includes('chat') || name.includes('message'))
    return { icon: 'MessageSquare', category: 'テキスト・チャット・メッセージ' };
  if (name.includes('email') || name.includes('mail')) return { icon: 'Mail', category: 'メール' };
  if (name.includes('calendar') || name.includes('date') || name.includes('schedule'))
    return { icon: 'Calendar', category: 'カレンダー・日付・スケジュール' };
  if (name.includes('user') || name.includes('profile') || name.includes('account'))
    return { icon: 'User', category: 'ユーザー・プロフィール・アカウント' };
  if (name.includes('math') || name.includes('calculate') || name.includes('compute'))
    return { icon: 'Calculator', category: '計算・数学' };
  if (name.includes('weather') || name.includes('forecast'))
    return { icon: 'Cloud', category: '天気・気象' };
  if (name.includes('audio') || name.includes('sound') || name.includes('music'))
    return { icon: 'Volume2', category: '音声・音楽' };
  if (name.includes('video') || name.includes('media'))
    return { icon: 'Play', category: '動画・メディア' };
  if (name.includes('map') || name.includes('location') || name.includes('geo'))
    return { icon: 'MapPin', category: '位置情報・マップ' };
  if (name.includes('generate') || name.includes('create'))
    return { icon: 'Sparkles', category: '生成・作成' };
  if (name.includes('delete') || name.includes('remove'))
    return { icon: 'Trash2', category: '削除・除去' };
  if (name.includes('list') || name.includes('enum'))
    return { icon: 'List', category: 'リスト・列挙' };
  if (name.includes('echo') || name.includes('ping') || name.includes('test'))
    return { icon: 'Zap', category: 'エコー・ping・テスト' };
  if (name.includes('code') || name.includes('script') || name.includes('compile'))
    return { icon: 'Code', category: 'コード・スクリプト・コンパイル' };

  return { icon: 'Settings', category: 'デフォルト' };
};
