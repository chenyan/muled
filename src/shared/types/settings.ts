import type { MuledConfig } from './config';

/** 设置窗口可编辑的完整配置快照（不含密钥明文回显） */
export type SettingsForm = MuledConfig;

export interface SettingsGetResult {
  configPath: string;
  settings: SettingsForm;
  /** API Key 已配置；表单中 api_key 留空表示不修改 */
  openai_key_configured: boolean;
}
