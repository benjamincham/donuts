/**
 * Agent 関連の型定義
 */

export interface Scenario {
  id: string;
  title: string; // シナリオ名（例: 「コードレビュー依頼」）
  prompt: string; // プロンプトテンプレート
}

export interface Agent {
  id: string; // UUID
  name: string; // Agent名
  description: string; // 説明
  systemPrompt: string; // システムプロンプト
  enabledTools: string[]; // 有効化されたツール名の配列
  scenarios: Scenario[]; // よく使うプロンプト
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agent作成時の入力データ
 */
export interface CreateAgentInput {
  name: string;
  description: string;
  systemPrompt: string;
  enabledTools: string[];
  scenarios: Omit<Scenario, 'id'>[];
}

/**
 * Agent更新時の入力データ
 */
export interface UpdateAgentInput extends Partial<CreateAgentInput> {
  id: string;
}

/**
 * AgentStore の状態
 */
export interface AgentState {
  agents: Agent[];
  selectedAgent: Agent | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * AgentStore のアクション
 */
export interface AgentActions {
  // Agent CRUD
  createAgent: (input: CreateAgentInput) => Agent;
  updateAgent: (input: UpdateAgentInput) => void;
  deleteAgent: (id: string) => void;
  getAgent: (id: string) => Agent | undefined;

  // Agent選択
  selectAgent: (agent: Agent | null) => void;

  // 初期化・リセット
  initializeStore: () => void;
  clearError: () => void;

  // LocalStorage 操作
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
}

/**
 * AgentStore の完全な型
 */
export type AgentStore = AgentState & AgentActions;

/**
 * デフォルトAgent作成用のデータ
 */
export const DEFAULT_AGENTS: CreateAgentInput[] = [
  {
    name: '汎用アシスタント',
    description: '様々なタスクに対応できる汎用的なAIアシスタント',
    systemPrompt: `あなたは親切で知識豊富なAIアシスタントです。ユーザーの質問に対して、正確で分かりやすい回答を提供してください。

以下の点を心がけてください：
- 日本語で自然に回答する
- 専門的な内容も初心者にも理解しやすいように説明する
- 不明な点があれば素直に「分からない」と答える
- 必要に応じて追加の質問をする`,
    enabledTools: [],
    scenarios: [
      {
        title: '質問・相談',
        prompt: '以下について教えてください:\n\n',
      },
      {
        title: '文章の添削',
        prompt: '以下の文章を添削・改善してください:\n\n',
      },
    ],
  },
  {
    name: 'コードレビューAgent',
    description: 'コードレビューとプログラミング支援に特化したAgent',
    systemPrompt: `あなたは経験豊富なソフトウェアエンジニアです。コードレビューとプログラミング支援を専門とします。

以下の観点でコードを評価してください：
- 可読性と保守性
- パフォーマンス
- セキュリティ
- ベストプラクティス
- バグの可能性

改善提案は具体的で実装可能なものを提供してください。`,
    enabledTools: [],
    scenarios: [
      {
        title: 'コードレビュー',
        prompt:
          '以下のコードをレビューしてください。改善点があれば具体的な提案をお願いします:\n\n```\n\n```',
      },
      {
        title: 'バグ調査',
        prompt:
          '以下のコードでバグが発生しています。原因を調査して修正案を提示してください:\n\n```\n\n```\n\nエラー内容:\n',
      },
      {
        title: 'リファクタリング',
        prompt: '以下のコードをより良い設計にリファクタリングしてください:\n\n```\n\n```',
      },
    ],
  },
];
