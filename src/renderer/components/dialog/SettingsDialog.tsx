import { useCallback, useEffect, useState } from 'react';
import type { SettingsForm } from '../../../shared/types/settings';
import './SettingsDialog.css';

export interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (settings: SettingsForm) => Promise<void>;
}

export default function SettingsDialog({
  open,
  onClose,
  onSaved,
}: SettingsDialogProps) {
  const [configPath, setConfigPath] = useState('');
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, saving]);

  useEffect(() => {
    if (!open || !window.muled?.config?.getSettings) return;
    setLoading(true);
    setError(null);
    window.muled.config
      .getSettings()
      .then((result) => {
        setConfigPath(result.configPath);
        setApiKeyConfigured(result.openai_key_configured);
        setForm(result.settings);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setForm(null);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const patch = useCallback(
    <K extends keyof SettingsForm>(section: K, value: SettingsForm[K]) => {
      setForm((prev) => (prev ? { ...prev, [section]: value } : prev));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!form || !window.muled?.config?.save) return;
    setSaving(true);
    setError(null);
    try {
      await onSaved(form);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [form, onClose, onSaved]);

  if (!open) return null;

  return (
    <div
      className="SettingsDialog__backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="SettingsDialog" role="dialog" aria-label="设置">
        <header className="SettingsDialog__header">
          <h2 className="SettingsDialog__title">设置</h2>
          <button
            type="button"
            className="SettingsDialog__close"
            aria-label="关闭"
            disabled={saving}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="SettingsDialog__body">
          {configPath ? (
            <p className="SettingsDialog__pathHint">
              配置文件：<code>{configPath}</code>
            </p>
          ) : null}

          {loading ? (
            <p className="SettingsDialog__pathHint">加载中…</p>
          ) : null}

          {form ? (
            <>
              <section className="SettingsDialog__section">
                <h3 className="SettingsDialog__sectionTitle">编辑器</h3>
                <div className="SettingsDialog__grid">
                  <label className="SettingsDialog__field">
                    <span className="SettingsDialog__label">键位模式</span>
                    <select
                      className="SettingsDialog__select"
                      value={form.editor.mode}
                      onChange={(e) =>
                        patch('editor', {
                          ...form.editor,
                          mode: e.target.value as SettingsForm['editor']['mode'],
                        })
                      }
                    >
                      <option value="vim">Vim</option>
                      <option value="normal">Normal</option>
                    </select>
                  </label>
                  <label className="SettingsDialog__field">
                    <span className="SettingsDialog__label">默认视图</span>
                    <select
                      className="SettingsDialog__select"
                      value={form.editor.default_view ?? 'source'}
                      onChange={(e) =>
                        patch('editor', {
                          ...form.editor,
                          default_view: e.target.value as NonNullable<
                            SettingsForm['editor']['default_view']
                          >,
                        })
                      }
                    >
                      <option value="source">源码</option>
                      <option value="rich-text">富文本</option>
                    </select>
                  </label>
                  <label className="SettingsDialog__field SettingsDialog__field--full">
                    <span className="SettingsDialog__label">源码字体</span>
                    <input
                      className="SettingsDialog__input"
                      value={form.editor.source.font_family}
                      onChange={(e) =>
                        patch('editor', {
                          ...form.editor,
                          source: {
                            ...form.editor.source,
                            font_family: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label className="SettingsDialog__field">
                    <span className="SettingsDialog__label">源码字号</span>
                    <input
                      className="SettingsDialog__input"
                      type="number"
                      min={8}
                      max={96}
                      value={form.editor.source.font_size}
                      onChange={(e) =>
                        patch('editor', {
                          ...form.editor,
                          source: {
                            ...form.editor.source,
                            font_size: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                  <label className="SettingsDialog__field SettingsDialog__field--full">
                    <span className="SettingsDialog__label">富文本字体</span>
                    <input
                      className="SettingsDialog__input"
                      value={form.editor.wysiwyg.font_family}
                      onChange={(e) =>
                        patch('editor', {
                          ...form.editor,
                          wysiwyg: {
                            ...form.editor.wysiwyg,
                            font_family: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label className="SettingsDialog__field">
                    <span className="SettingsDialog__label">富文本字号</span>
                    <input
                      className="SettingsDialog__input"
                      type="number"
                      min={8}
                      max={96}
                      value={form.editor.wysiwyg.font_size}
                      onChange={(e) =>
                        patch('editor', {
                          ...form.editor,
                          wysiwyg: {
                            ...form.editor.wysiwyg,
                            font_size: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="SettingsDialog__section">
                <h3 className="SettingsDialog__sectionTitle">工作区与界面</h3>
                <div className="SettingsDialog__grid">
                  <label className="SettingsDialog__field SettingsDialog__field--full">
                    <span className="SettingsDialog__label">默认工作区路径</span>
                    <input
                      className="SettingsDialog__input"
                      value={form.workspace.path}
                      onChange={(e) =>
                        patch('workspace', { path: e.target.value })
                      }
                    />
                  </label>
                  <label className="SettingsDialog__field">
                    <span className="SettingsDialog__label">侧栏宽度 (px)</span>
                    <input
                      className="SettingsDialog__input"
                      type="number"
                      min={120}
                      max={800}
                      value={form.ui.sidebar_width}
                      onChange={(e) =>
                        patch('ui', {
                          ...form.ui,
                          sidebar_width: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="SettingsDialog__field">
                    <span className="SettingsDialog__label">目录树默认展开深度</span>
                    <input
                      className="SettingsDialog__input"
                      type="number"
                      min={0}
                      max={8}
                      value={form.ui.tree_initial_expansion_depth}
                      onChange={(e) =>
                        patch('ui', {
                          ...form.ui,
                          tree_initial_expansion_depth: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="SettingsDialog__section">
                <h3 className="SettingsDialog__sectionTitle">OpenAI</h3>
                <div className="SettingsDialog__grid">
                  <label className="SettingsDialog__field SettingsDialog__field--full">
                    <span className="SettingsDialog__label">模型</span>
                    <input
                      className="SettingsDialog__input"
                      value={form.openai.model}
                      onChange={(e) =>
                        patch('openai', {
                          ...form.openai,
                          model: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="SettingsDialog__field SettingsDialog__field--full">
                    <span className="SettingsDialog__label">API Key</span>
                    <input
                      className="SettingsDialog__input"
                      type="password"
                      autoComplete="off"
                      placeholder={
                        apiKeyConfigured ? '已配置，留空则不修改' : 'sk-…'
                      }
                      value={form.openai.api_key}
                      onChange={(e) =>
                        patch('openai', {
                          ...form.openai,
                          api_key: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="SettingsDialog__field SettingsDialog__field--full">
                    <span className="SettingsDialog__label">Base URL（可选）</span>
                    <input
                      className="SettingsDialog__input"
                      placeholder="留空使用官方地址"
                      value={form.openai.base_url ?? ''}
                      onChange={(e) =>
                        patch('openai', {
                          ...form.openai,
                          base_url: e.target.value.trim() || null,
                        })
                      }
                    />
                  </label>
                </div>
              </section>
            </>
          ) : null}
        </div>

        {error ? <p className="SettingsDialog__error">{error}</p> : null}

        <footer className="SettingsDialog__footer">
          <button
            type="button"
            className="SettingsDialog__btn"
            disabled={saving}
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="SettingsDialog__btn SettingsDialog__btn--primary"
            disabled={saving || loading || !form}
            onClick={() => {
              handleSave().catch(() => undefined);
            }}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </footer>
      </div>
    </div>
  );
}
