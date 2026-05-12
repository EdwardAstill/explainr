import React, { useMemo, useState } from "react";
import { Flow } from "@readrun/widgets/diagram";
import type { DiagramEdge, DiagramNode, PositionedNode } from "@readrun/widgets/diagram";
import {
  Btn,
  LegendDot,
  SectionLabel,
  Slider,
  Stat,
  Tabs,
  WidgetLayout,
} from "@readrun/widgets/primitives";

type Branch = "main" | "feature" | "release" | "hotfix";
type ViewMode = "history" | "ancestry" | "refs";

interface GitCommit {
  id: string;
  title: string;
  branch: Branch;
  parents: string[];
  x: number;
  y: number;
  refs?: string[];
}

interface GitStep {
  label: string;
  command: string;
  description: string;
  branch: Branch;
  visibleCount: number;
  focusCommit: string;
  changes: string[];
  result: string;
}

const BRANCHES: Array<{ id: Branch; label: string; color: string }> = [
  { id: "main", label: "main", color: "var(--text)" },
  { id: "feature", label: "feature/login", color: "var(--viz-trace)" },
  { id: "release", label: "release/1.2", color: "var(--viz-positive)" },
  { id: "hotfix", label: "hotfix/payments", color: "var(--viz-warn)" },
];

const MODES: Array<{ id: ViewMode; label: string }> = [
  { id: "history", label: "History" },
  { id: "ancestry", label: "Ancestry" },
  { id: "refs", label: "Refs" },
];

const COMMITS: GitCommit[] = [
  {
    id: "a1e4c9",
    title: "initial app shell",
    branch: "main",
    parents: [],
    x: 0,
    y: 360,
    refs: ["tag: v1.0"],
  },
  {
    id: "b62011",
    title: "data loader",
    branch: "main",
    parents: ["a1e4c9"],
    x: 0,
    y: 320,
  },
  {
    id: "c83b7a",
    title: "dashboard frame",
    branch: "main",
    parents: ["b62011"],
    x: 0,
    y: 280,
  },
  {
    id: "d337ad",
    title: "login branch",
    branch: "feature",
    parents: ["c83b7a"],
    x: -150,
    y: 240,
  },
  {
    id: "e7c125",
    title: "oauth callback",
    branch: "feature",
    parents: ["d337ad"],
    x: -150,
    y: 200,
    refs: ["feature/login"],
  },
  {
    id: "f40d72",
    title: "release branch",
    branch: "release",
    parents: ["c83b7a"],
    x: 150,
    y: 240,
  },
  {
    id: "g91ab0",
    title: "payment patch",
    branch: "hotfix",
    parents: ["f40d72"],
    x: 275,
    y: 200,
    refs: ["hotfix/payments"],
  },
  {
    id: "h23df8",
    title: "merge hotfix",
    branch: "release",
    parents: ["f40d72", "g91ab0"],
    x: 150,
    y: 160,
    refs: ["release/1.2"],
  },
  {
    id: "i45a0b",
    title: "copy updates",
    branch: "main",
    parents: ["c83b7a"],
    x: 0,
    y: 220,
  },
  {
    id: "j8c9e1",
    title: "merge login",
    branch: "main",
    parents: ["i45a0b", "e7c125"],
    x: 0,
    y: 120,
  },
  {
    id: "k135aa",
    title: "ship release",
    branch: "main",
    parents: ["j8c9e1", "h23df8"],
    x: 0,
    y: 80,
    refs: ["main", "HEAD"],
  },
];

const STEPS: GitStep[] = [
  {
    label: "init",
    command: "git init\ngit add .\ngit commit -m \"initial app shell\"\ngit tag v1.0",
    description: "Repository starts on main with a single root commit.",
    branch: "main",
    visibleCount: 1,
    focusCommit: "a1e4c9",
    changes: ["Created package.json", "Created src/app.tsx", "Tagged baseline as v1.0"],
    result: "main and tag v1.0 point at a1e4c9.",
  },
  {
    label: "commit",
    command: "git commit -m \"data loader\"",
    description: "main advances by one ordinary commit.",
    branch: "main",
    visibleCount: 2,
    focusCommit: "b62011",
    changes: ["Added src/data/loaders.ts", "Updated README usage notes"],
    result: "HEAD moves from a1e4c9 to b62011.",
  },
  {
    label: "commit",
    command: "git commit -m \"dashboard frame\"",
    description: "A shared UI frame lands before branch work begins.",
    branch: "main",
    visibleCount: 3,
    focusCommit: "c83b7a",
    changes: ["Added src/dashboard/frame.tsx", "Adjusted layout styles"],
    result: "c83b7a becomes the common ancestor for later branches.",
  },
  {
    label: "branch",
    command: "git switch -c feature/login\ngit add src/auth/login-form.tsx\ngit commit -m \"login branch\"",
    description: "A feature branch forks from main, then records its first feature commit.",
    branch: "feature",
    visibleCount: 4,
    focusCommit: "d337ad",
    changes: ["Added login form scaffold", "No main files changed after branch point"],
    result: "feature/login points at d337ad while main remains at c83b7a.",
  },
  {
    label: "commit",
    command: "git commit -m \"oauth callback\"",
    description: "More work is committed on feature/login.",
    branch: "feature",
    visibleCount: 5,
    focusCommit: "e7c125",
    changes: ["Added src/auth/oauth.ts", "Updated tests for callback parsing"],
    result: "feature/login advances to e7c125.",
  },
  {
    label: "branch",
    command: "git switch -c release/1.2 c83b7a\ngit add docs/release-notes.md src/dashboard/copy.ts\ngit commit -m \"release branch\"",
    description: "A release branch starts from the stable dashboard frame, then commits release prep.",
    branch: "release",
    visibleCount: 6,
    focusCommit: "f40d72",
    changes: ["Prepared release notes", "Pinned dashboard copy for release"],
    result: "release/1.2 diverges from main and feature/login.",
  },
  {
    label: "hotfix",
    command: "git switch -c hotfix/payments\ngit add src/payments/checkout.ts src/payments/checkout.test.ts\ngit commit -m \"payment patch\"",
    description: "A short hotfix branch fixes release-critical payment behavior.",
    branch: "hotfix",
    visibleCount: 7,
    focusCommit: "g91ab0",
    changes: ["Patched src/payments/checkout.ts", "Added regression test"],
    result: "hotfix/payments points at g91ab0.",
  },
  {
    label: "merge",
    command: "git switch release/1.2 && git merge hotfix/payments",
    description: "The hotfix is merged into the release branch.",
    branch: "release",
    visibleCount: 8,
    focusCommit: "h23df8",
    changes: ["Merged checkout fix into release/1.2", "No feature/login files included"],
    result: "h23df8 has two parents: f40d72 and g91ab0.",
  },
  {
    label: "commit",
    command: "git switch main && git commit -m \"copy updates\"",
    description: "main continues independently while branches are open.",
    branch: "main",
    visibleCount: 9,
    focusCommit: "i45a0b",
    changes: ["Edited src/dashboard/copy.ts", "Updated docs/changelog.md"],
    result: "main advances to i45a0b without pulling in feature/login yet.",
  },
  {
    label: "merge",
    command: "git merge feature/login",
    description: "The login feature branch is merged back into main.",
    branch: "main",
    visibleCount: 10,
    focusCommit: "j8c9e1",
    changes: ["Integrated src/auth/oauth.ts", "Resolved dashboard route conflict"],
    result: "j8c9e1 joins main history with feature/login history.",
  },
  {
    label: "merge",
    command: "git merge release/1.2",
    description: "Release branch changes and hotfix history are brought into main.",
    branch: "main",
    visibleCount: 11,
    focusCommit: "k135aa",
    changes: ["Brought payment hotfix into main", "Moved main and HEAD to final merge"],
    result: "HEAD and main now point at k135aa.",
  },
];

function branchColor(branch: Branch): string {
  return BRANCHES.find((b) => b.id === branch)?.color ?? "var(--text-muted)";
}

function isBranch(value: unknown): value is Branch {
  return (
    value === "main" ||
    value === "feature" ||
    value === "release" ||
    value === "hotfix"
  );
}

function refsOf(node: PositionedNode): string[] {
  return Array.isArray(node.refs)
    ? node.refs.filter((ref) => typeof ref === "string")
    : [];
}

function buildEdges(commits: GitCommit[]): DiagramEdge[] {
  const ids = new Set(commits.map((commit) => commit.id));
  return commits.flatMap((commit) =>
    commit.parents
      .filter((parent) => ids.has(parent))
      .map((parent) => ({
        id: `${commit.id}-${parent}`,
        from: commit.id,
        to: parent,
        branch: commit.branch,
      })),
  );
}

function ancestryIds(selectedId: string, commits: GitCommit[]): Set<string> {
  const byId = new Map(commits.map((commit) => [commit.id, commit]));
  const out = new Set<string>([selectedId]);
  const stack = [selectedId];

  while (stack.length > 0) {
    const current = byId.get(stack.pop() ?? "");
    if (!current) continue;
    for (const parent of current.parents) {
      if (out.has(parent)) continue;
      out.add(parent);
      stack.push(parent);
    }
  }

  return out;
}

function toNodes(commits: GitCommit[]): DiagramNode[] {
  return commits.map((commit) => ({
    ...commit,
    label: commit.id,
    width: commit.parents.length > 1 ? 88 : 78,
    height: commit.parents.length > 1 ? 32 : 28,
  }));
}

function edgeBranch(edge: DiagramEdge): Branch {
  return isBranch(edge.branch) ? edge.branch : "main";
}

function mergeCount(commits: GitCommit[]): number {
  return commits.filter((commit) => commit.parents.length > 1).length;
}

function GitNode({
  node,
  selected,
  dimmed,
  onSelect,
}: {
  node: PositionedNode;
  selected: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
}) {
  const branch = isBranch(node.branch) ? node.branch : "main";
  const refs = refsOf(node);
  const color = branchColor(branch);
  const isMerge = Array.isArray(node.parents) && node.parents.length > 1;

  return (
    <g
      transform={`translate(${node.x - node.width / 2}, ${node.y - node.height / 2})`}
      onClick={() => onSelect(node.id)}
      style={{ cursor: "pointer", opacity: dimmed ? 0.25 : 1 }}
    >
      <rect
        width={node.width}
        height={node.height}
        fill="var(--bg)"
        stroke={selected ? "var(--text)" : color}
        strokeWidth={selected ? 2.5 : 1.5}
        rx={0}
      />
      <rect width={6} height={node.height} fill={color} />
      {isMerge && (
        <path
          d={`M ${node.width - 13} 7 L ${node.width - 6} ${node.height / 2} L ${node.width - 13} ${node.height - 7} L ${node.width - 20} ${node.height / 2} Z`}
          fill="none"
          stroke={color}
          strokeWidth={1.2}
        />
      )}
      <text
        x={14}
        y={node.height / 2 + 4}
        fontSize={11}
        fill="var(--text)"
        fontFamily="var(--font-mono, ui-monospace, monospace)"
        style={{ userSelect: "none" }}
      >
        {node.id}
      </text>
      {refs.map((ref, index) => {
        const refWidth = Math.max(42, ref.length * 7 + 10);
        const refX = node.x > 170 ? -refWidth - 8 : node.width + 8;
        return (
          <g key={ref} transform={`translate(${refX}, ${index * 18 - 2})`}>
            <rect
              width={refWidth}
              height={15}
              fill="var(--input-bg)"
              stroke="var(--border)"
            />
            <text
              x={5}
              y={11}
              fontSize={11}
              fill="var(--text-muted)"
              fontFamily="var(--font-mono, ui-monospace, monospace)"
              style={{ userSelect: "none" }}
            >
              {ref}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <strong style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)", textAlign: "right" }}>
        {value}
      </strong>
    </div>
  );
}

function StepBadge({ step }: { step: GitStep }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid var(--border)",
        background: "var(--input-bg)",
        padding: "3px 7px",
        fontSize: 11,
        fontFamily: "var(--font-mono, ui-monospace, monospace)",
        color: "var(--text-muted)",
      }}
    >
      {step.label}
    </span>
  );
}

export function GitGraphExplorer() {
  const [stepIndex, setStepIndex] = useState(STEPS.length - 1);
  const [mode, setMode] = useState<ViewMode>("history");
  const [selectedId, setSelectedId] = useState(STEPS[STEPS.length - 1]?.focusCommit ?? "");

  const step = STEPS[stepIndex] ?? STEPS[STEPS.length - 1]!;
  const visibleCommits = useMemo(() => COMMITS.slice(0, step.visibleCount), [step.visibleCount]);
  const visibleIds = useMemo(
    () => new Set(visibleCommits.map((commit) => commit.id)),
    [visibleCommits],
  );
  const refIds = useMemo(
    () => new Set(visibleCommits.filter((commit) => commit.refs?.length).map((commit) => commit.id)),
    [visibleCommits],
  );
  const activeId = visibleIds.has(selectedId) ? selectedId : step.focusCommit;
  const selectedCommit = visibleIds.has(activeId)
    ? visibleCommits.find((commit) => commit.id === activeId)
    : visibleCommits[visibleCommits.length - 1];
  const focusedId = selectedCommit?.id ?? step.focusCommit;
  const ancestry = useMemo(
    () => ancestryIds(focusedId, visibleCommits),
    [focusedId, visibleCommits],
  );
  const edges = useMemo(() => buildEdges(visibleCommits), [visibleCommits]);

  const stepCommit = visibleIds.has(step.focusCommit)
    ? visibleCommits.find((commit) => commit.id === step.focusCommit)
    : undefined;

  const dimForMode = (id: string) =>
    (mode === "ancestry" && !ancestry.has(id)) ||
    (mode === "refs" && !refIds.has(id) && id !== focusedId);
  const visibleRefs = visibleCommits.flatMap((commit) => commit.refs ?? []);

  return (
    <WidgetLayout
      arrangement="visual-left"
      title="Git Graph Explorer"
      subtitle="Scrub through Git commands and watch branch refs, merge commits, and file changes accumulate."
      headMeta={
        <>
          <Stat label="commits" value={visibleCommits.length} />
          <Stat label="merges" value={mergeCount(visibleCommits)} />
        </>
      }
    >
      <WidgetLayout.Visual>
        <div style={{ padding: 12 }}>
          <Flow
            nodes={toNodes(visibleCommits)}
            edges={edges}
            layout="manual"
            edgeRouter="curve"
            width={720}
            height={430}
            draggable={false}
            renderEdge={(_, edge, fromNode, toNode) => {
              const selectedEdge = focusedId === edge.from || focusedId === edge.to;
              const ancestryEdge =
                mode === "ancestry" && ancestry.has(edge.from) && ancestry.has(edge.to);
              const refEdge = mode === "refs" && (refIds.has(edge.from) || refIds.has(edge.to));
              const highlighted = selectedEdge || ancestryEdge || refEdge;
              const dimmed =
                (mode === "ancestry" && !highlighted) ||
                (mode === "refs" && !highlighted);
              const color = branchColor(edgeBranch(edge));
              const midY = (fromNode.y + toNode.y) / 2;
              const path = `M ${fromNode.x} ${fromNode.y} C ${fromNode.x} ${midY}, ${toNode.x} ${midY}, ${toNode.x} ${toNode.y}`;
              return (
                <path
                  key={edge.id}
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={highlighted ? 2.5 : 1.4}
                  opacity={dimmed ? 0.18 : 0.75}
                />
              );
            }}
            renderNode={(node) => (
              <GitNode
                node={node}
                selected={node.id === focusedId}
                dimmed={dimForMode(node.id)}
                onSelect={setSelectedId}
              />
            )}
          />
        </div>
      </WidgetLayout.Visual>

      <WidgetLayout.Controls>
        <Slider
          label="command step"
          min={1}
          max={STEPS.length}
          step={1}
          value={stepIndex + 1}
          onChange={(value) => {
            const nextIndex = value - 1;
            setStepIndex(nextIndex);
            const next = STEPS[nextIndex];
            if (next) setSelectedId(next.focusCommit);
          }}
          format={(value) => `${value.toFixed(0)} / ${STEPS.length}`}
        />

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <StepBadge step={step} />
          <strong>{step.description}</strong>
        </div>

        <SectionLabel>Commands run</SectionLabel>
        <pre
          style={{
            margin: "0 0 12px",
            padding: 10,
            overflowX: "auto",
            background: "var(--input-bg)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontSize: 11,
            lineHeight: 1.45,
          }}
        >
          {step.command}
        </pre>

        <SectionLabel>What changed</SectionLabel>
        <ul style={{ margin: "0 0 12px", paddingLeft: 18, lineHeight: 1.55, fontSize: 11 }}>
          {step.changes.map((change) => (
            <li key={change}>{change}</li>
          ))}
        </ul>

        <div style={{ display: "grid", gap: 7, fontSize: 11, marginBottom: 14 }}>
          <DetailRow label="active branch" value={step.branch} />
          <DetailRow label="focused commit" value={step.focusCommit} />
          <DetailRow label="result" value={step.result} />
          {stepCommit && (
            <DetailRow
              label="parents"
              value={stepCommit.parents.length ? stepCommit.parents.join(" ") : "root"}
            />
          )}
        </div>

        <Tabs value={mode} onChange={(id) => setMode(id as ViewMode)} items={MODES} />

        <SectionLabel style={{ marginTop: 14 }}>Branches</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
          {BRANCHES.map((branch) => (
            <LegendDot key={branch.id} color={branch.color} label={branch.label} />
          ))}
        </div>

        {selectedCommit && selectedCommit.id !== step.focusCommit && (
          <div style={{ display: "grid", gap: 7, fontSize: 11 }}>
            <SectionLabel>Clicked commit</SectionLabel>
            <DetailRow label="sha" value={selectedCommit.id} />
            <DetailRow label="message" value={selectedCommit.title} />
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          <Btn kind="ghost" onClick={() => setSelectedId(COMMITS[0]?.id ?? "")}>
            Root
          </Btn>
          <Btn
            kind="ghost"
            onClick={() => setSelectedId(step.focusCommit)}
          >
            Step focus
          </Btn>
        </div>
      </WidgetLayout.Controls>

      <WidgetLayout.Aside>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.55 }}>
          <li>
            The slider is the story spine: each stop is one command and the graph only shows the
            commits that exist after that command.
          </li>
          <li>
            The right panel names changed files, moved branches, parent links, and merge effects.
          </li>
          <li>
            {visibleRefs.length > 0 ? (
              <>
                Current visible refs: <code>{visibleRefs.join(", ")}</code>.
              </>
            ) : (
              "Move the scrubber forward to reveal branch and tag refs."
            )}
          </li>
        </ul>
      </WidgetLayout.Aside>
    </WidgetLayout>
  );
}
