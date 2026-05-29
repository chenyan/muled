import OpenAI from 'openai';
import { buildAiUserContent } from '../../shared/buildAiPrompt';
import type ConfigService from './configService';

export default class OpenAIService {
  private readonly configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  async complete(
    prompt: string,
    selection: string,
  ): Promise<{ text: string } | { error: string }> {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      return { error: '请输入提示词' };
    }
    if (!selection.trim()) {
      return { error: '请先选中要处理的文本' };
    }

    const { openai } = this.configService.get();
    if (!openai.api_key) {
      return {
        error:
          '未配置 API Key，请在 ~/.config/muled/muled.yaml 中设置 openai.api_key',
      };
    }

    const client = new OpenAI({
      apiKey: openai.api_key,
      baseURL: openai.base_url ?? undefined,
      timeout: 60_000,
    });

    try {
      const response = await client.chat.completions.create({
        model: openai.model,
        messages: [
          {
            role: 'user',
            content: buildAiUserContent(trimmedPrompt, selection),
          },
        ],
      });
      const text = response.choices[0]?.message?.content?.trim() ?? '';
      if (!text) {
        return { error: '模型返回空内容' };
      }
      return { text };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: message };
    }
  }
}
