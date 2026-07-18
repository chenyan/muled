# Lezer 符号导航

基于 CodeMirror 现有 Lezer 语法树的「按名」符号导航（非 LSP / 非 tree-sitter）。

## 能力

范围均为 **已打开的源码标签页**：

| 功能 | 操作 |
|------|------|
| 定义浮窗 | 鼠标悬停标识符 |
| 转到符号 | `Mod-Shift-O` |
| 转到定义 | 按住 `Cmd/Ctrl` 时可跳转符号显示下划线；点击跳转（多候选时弹出选择） |
| 查找引用 | `Shift-F12` |
| 大纲 | 侧栏大纲使用同一套 Lezer 提取，并保持原有层级与收录范围 |

函数参数和各语言局部变量也会进入导航索引；新增的导航定义不会扩大原有大纲的收录范围。

## 支持语言

`javascript` / `typescript` / `jsx` / `tsx` / `python` / `rust` / `go` / `java` / `cpp` / `scheme`

`StreamLanguage`（latex、scala）与 `plain` 不参与提取。

## 边界

- 同名匹配，不做 import 图 / 类型绑定
- 多候选时展示路径与行号，由用户选择
- Markdown / Org / HTML / PDF 大纲逻辑不变
