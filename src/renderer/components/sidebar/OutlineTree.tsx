import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildOutlineTree,
  type OutlineTreeNode,
  type SidebarOutlineItem,
} from '../../lib/outlineIndex';

interface OutlineTreeProps {
  items: SidebarOutlineItem[];
  onRevealInEditor: (item: SidebarOutlineItem) => void;
}

function collectExpandableIds(nodes: OutlineTreeNode[]): Set<string> {
  const ids = new Set<string>();
  const walk = (list: OutlineTreeNode[]) => {
    for (const node of list) {
      if (node.children.length > 0) {
        ids.add(node.item.id);
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return ids;
}

function OutlineTreeNodeRow({
  node,
  level,
  expandedIds,
  onToggle,
  onRevealInEditor,
}: {
  node: OutlineTreeNode;
  level: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onRevealInEditor: (item: SidebarOutlineItem) => void;
}) {
  const { item, children } = node;
  const hasChildren = children.length > 0;
  const expanded = !hasChildren || expandedIds.has(item.id);

  return (
    <li className="OutlineTree__node">
      <div
        className="OutlineTree__row"
        style={{ paddingLeft: `${6 + level * 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className={`OutlineTree__toggle${expanded ? ' OutlineTree__toggle--expanded' : ''}`}
            aria-label={expanded ? '折叠' : '展开'}
            aria-expanded={expanded}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(item.id);
            }}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 4l4 4-4 4" />
            </svg>
          </button>
        ) : (
          <span className="OutlineTree__toggleSpacer" aria-hidden="true" />
        )}
        <button
          type="button"
          className="OutlineTree__item"
          onClick={() => {
            if (item.line) {
              onRevealInEditor(item);
            }
          }}
          title={item.page ? `第 ${item.page} 页` : undefined}
        >
          <span className="OutlineTree__title">{item.title}</span>
          {item.page ? (
            <span className="OutlineTree__meta">P{item.page}</span>
          ) : item.line ? (
            <span className="OutlineTree__meta">L{item.line}</span>
          ) : null}
        </button>
      </div>
      {hasChildren && expanded ? (
        <ul className="OutlineTree__children">
          {children.map((child) => (
            <OutlineTreeNodeRow
              key={child.item.id}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onRevealInEditor={onRevealInEditor}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function OutlineTree({
  items,
  onRevealInEditor,
}: OutlineTreeProps) {
  const tree = useMemo(() => buildOutlineTree(items), [items]);
  const expandableIds = useMemo(() => collectExpandableIds(tree), [tree]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setExpandedIds(new Set(expandableIds));
  }, [expandableIds]);

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <ul className="OutlineTree">
      {tree.map((node) => (
        <OutlineTreeNodeRow
          key={node.item.id}
          node={node}
          level={0}
          expandedIds={expandedIds}
          onToggle={handleToggle}
          onRevealInEditor={onRevealInEditor}
        />
      ))}
    </ul>
  );
}
