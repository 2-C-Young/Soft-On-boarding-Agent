import { useState, useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

import { DomainNode } from '../components/diagram/DomainNode';
import { ServiceNode } from '../components/diagram/ServiceNode';
import { MethodNode } from '../components/diagram/MethodNode';
import { ContextDrawer } from '../components/common/ContextDrawer';
import { spaceApi } from '../services/spaceApi';
import { functionalViewApi, type CommitSummary } from '../services/functionalViewApi';
import { useAuthStore } from '../store/authStore';

const nodeTypes = {
  domainNode: DomainNode,
  serviceNode: ServiceNode,
  methodNode: MethodNode,
};

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  // LR: Left to Right
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 100, align: 'UL' });

  nodes.forEach((node) => {
    let width = 240, height = 80;
    if (node.type === 'domainNode') { width = 240; height = 90; }
    if (node.type === 'serviceNode') { width = 220; height = 80; }
    if (node.type === 'methodNode') { width = 180; height = 60; }
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    let width = 240, height = 80;
    if (node.type === 'domainNode') { width = 240; height = 90; }
    if (node.type === 'serviceNode') { width = 220; height = 80; }
    if (node.type === 'methodNode') { width = 180; height = 60; }

    node.position = {
      x: nodeWithPosition.x - width / 2,
      y: nodeWithPosition.y - height / 2,
    };
  });

  return { nodes, edges };
};

function FunctionalViewContent() {
  const spaceId = useAuthStore((state) => state.user?.spaceId);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Raw data from API
  const [rawNodes, setRawNodes] = useState<any[]>([]);
  const [rawEdges, setRawEdges] = useState<any[]>([]);

  // Progressive Disclosure State
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // 노드 클릭 시 조회한 실제 커밋 히스토리
  const [nodeCommits, setNodeCommits] = useState<CommitSummary[]>([]);
  const [isCommitsLoading, setIsCommitsLoading] = useState(false);

  const { fitView } = useReactFlow();

  // API Fetch
  useEffect(() => {
    const fetchData = async () => {
      if (!spaceId) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await spaceApi.getFunctionalView(spaceId);
        setRawNodes(data.nodes);
        setRawEdges(data.edges);
        setError(null);
      } catch (err: any) {
        setError(err.message || '데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [spaceId]);

  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const onNodeClick = useCallback(async (_event: React.MouseEvent, node: Node) => {
    if (node.type === 'serviceNode' || node.type === 'methodNode') {
      // 1. Drawer를 즉시 열어 빠른 반응성 확보
      setSelectedNode(node);
      setIsDrawerOpen(true);
      setNodeCommits([]);

      // 2. 커밋 히스토리는 비동기로 불러와 Drawer 안에서 스피너 → 리스트로 교체
      if (!spaceId) return;
      setIsCommitsLoading(true);
      try {
        const raw = await functionalViewApi.getCommitsForElement(
          spaceId,
          Number(node.id)
        );
        // SHA 기준 중복 제거 (GitHub API가 동일 커밋을 중복 반환하는 경우 방어)
        const seen = new Set<string>();
        const deduped = raw.filter(c => {
          if (seen.has(c.sha)) return false;
          seen.add(c.sha);
          return true;
        });
        setNodeCommits(deduped);
      } catch {
        setNodeCommits([]);
      } finally {
        setIsCommitsLoading(false);
      }
    }
  }, [spaceId]);

  // Compute Layout when data or expanded state changes
  useEffect(() => {
    if (rawNodes.length === 0) return;

    // 1. Calculate Visibility
    const visibleNodeIds = new Set<string>();
    const queue: string[] = [];

    rawNodes.forEach(n => {
      if (!n.parentId) {
        visibleNodeIds.add(n.id);
        if (expandedNodeIds.has(n.id)) {
          queue.push(n.id);
        }
      }
    });

    while (queue.length > 0) {
      const parentId = queue.shift()!;
      rawNodes.forEach(n => {
        if (n.parentId === parentId) {
          visibleNodeIds.add(n.id);
          if (expandedNodeIds.has(n.id)) {
            queue.push(n.id);
          }
        }
      });
    }

    // 2. Map to React Flow Nodes
    const mappedNodes: Node[] = rawNodes
      .filter(n => visibleNodeIds.has(n.id))
      .map(node => {
        let frontendType = node.type;
        if (node.type === 'forestNode') frontendType = 'domainNode';
        if (node.type === 'treeNode') frontendType = 'serviceNode';
        if (node.type === 'ringNode') frontendType = 'methodNode';

        const hasChildren = rawNodes.some(n => n.parentId === node.id);

        return {
          id: node.id,
          type: frontendType,
          position: { x: 0, y: 0 },
          data: {
            ...node.data,
            isExpanded: expandedNodeIds.has(node.id),
            hasChildren,
            onToggle: toggleExpand,
            layer: node.type === 'treeNode' ? 'Service' : 'Controller',
          }
        };
      });

    // 3. Filter Edges
    const mappedEdges: Edge[] = rawEdges
      .filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
      .map(e => ({
        ...e,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed' as any, color: '#94a3b8' },
      }));

    // 4. Run Dagre Layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(mappedNodes, mappedEdges);

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    // 부드러운 포커스 애니메이션 (약간의 지연 후 실행하여 DOM 반영 대기)
    setTimeout(() => {
      fitView({ duration: 800, padding: 0.3 });
    }, 50);
  }, [rawNodes, rawEdges, expandedNodeIds, setNodes, setEdges, toggleExpand, fitView]);

  if (isLoading) {
    return <div className="w-full h-full flex items-center justify-center bg-gray-50/30">
      <div className="text-gray-500 animate-pulse font-medium tracking-wide">AI 분석 결과를 불러오는 중입니다...</div>
    </div>;
  }

  if (error) {
    return <div className="w-full h-full flex items-center justify-center bg-gray-50/30">
      <div className="text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</div>
    </div>;
  }

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={1.5}
        className="bg-gray-50/30"
      >
        <Background color="#9ca3af" gap={24} size={1} />
        <Controls className="bg-white shadow-sm border border-gray-200" />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'domainNode') return '#111827';
            if (node.type === 'serviceNode') return '#c084fc';
            if (node.type === 'methodNode') return '#60a5fa';
            return '#94a3b8';
          }}
          maskColor="rgba(248, 250, 252, 0.7)"
          className="bg-white shadow-sm border border-gray-200"
        />
      </ReactFlow>

      <ContextDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedNode={selectedNode}
        commits={nodeCommits}
        isCommitsLoading={isCommitsLoading}
      />
    </div>
  );
}

export function FunctionalView() {
  return (
    <ReactFlowProvider>
      <FunctionalViewContent />
    </ReactFlowProvider>
  );
}
