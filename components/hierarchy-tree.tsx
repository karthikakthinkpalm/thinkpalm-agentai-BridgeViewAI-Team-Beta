'use client';

import type { HierarchyNode } from '@/lib/preview/hierarchy';

function TreeNode({
  node,
  depth = 0,
  selectedId,
  onSelect,
}: {
  node: HierarchyNode;
  depth?: number;
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const isWidget = node.type === 'widget';
  const isSelected = selectedId === node.id;

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <button
        type="button"
        onClick={() => isWidget && onSelect?.(node.id)}
        disabled={!isWidget}
        className={`mb-1 flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left text-xs transition ${
          isWidget
            ? isSelected
              ? 'border border-teal-400/50 bg-teal-400/10 text-teal-100'
              : 'border border-transparent hover:border-slate-600 hover:bg-slate-900/80 text-slate-300'
            : 'cursor-default text-slate-400'
        }`}
      >
        <span className="mt-0.5 font-mono text-slate-600">
          {node.type === 'root' ? '◆' : node.type === 'layout' ? '▣' : '◇'}
        </span>
        <span className="flex-1">
          <span className={isWidget ? 'font-medium' : 'uppercase tracking-wider text-[0.65rem]'}>
            {node.label}
          </span>
          {node.description && (
            <span className="mt-0.5 block font-mono text-[0.6rem] text-slate-600">
              {node.description}
            </span>
          )}
        </span>
      </button>
      {node.children?.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function HierarchyTree({
  hierarchy,
  selectedId,
  onSelect,
}: {
  hierarchy: HierarchyNode | null;
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  if (!hierarchy) {
    return (
      <p className="text-xs font-mono text-slate-500">
        Widget hierarchy will appear after Agent 1 parses your spec.
      </p>
    );
  }

  return <TreeNode node={hierarchy} selectedId={selectedId} onSelect={onSelect} />;
}
