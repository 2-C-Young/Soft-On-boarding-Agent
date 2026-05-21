import { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  type Node, 
  type Edge,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useQuery } from '@tanstack/react-query';
import { functionalViewApi, type FunctionalNodeData } from '../services/functionalViewApi';
import { useAuthStore } from '../store/authStore';
import { mockFunctionalViewData } from '../mocks/functionalViewMock';

import { ForestNode } from '../components/diagram/ForestNode';
import { TreeNode } from '../components/diagram/TreeNode';
import { RingNode } from '../components/diagram/RingNode';
import { ContextDrawer } from '../components/common/ContextDrawer';
import { getLayoutedElements } from '../utils/layoutUtils';

const nodeTypes = {
  forestNode: ForestNode,
  treeNode: TreeNode,
  ringNode: RingNode,
};

export default function FunctionalView() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // 상태 관리: 어떤 노드가 펼쳐졌는지 ID 저장
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Drawer 상태
  const [selectedNode, setSelectedNode] = useState<Node<FunctionalNodeData> | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ─── 🚧 Mock 테스트 모드 ───────────────────────────────────────────
  // 실제 연동 시 아래 두 줄을 제거하고 주석 처리된 코드를 살려주세요.
  const MOCK_MODE = true;
  const MOCK_SPACE_ID = 999;
  // ─────────────────────────────────────────────────────────────────

  // 1. authStore에서 spaceId 직접 읽기 (API 추가 호출 불필요)
  const storeSpaceId = useAuthStore((state) => state.user?.spaceId ?? null);
  const spaceId = MOCK_MODE ? MOCK_SPACE_ID : storeSpaceId;

  // 2. spaceId로 Functional View 데이터 조회
  const { data: apiData, isLoading: isApiLoading, error } = useQuery({
    queryKey: ['functionalView', spaceId],
    queryFn: async () => {
      if (MOCK_MODE) return mockFunctionalViewData; // 🚧 Mock 데이터 반환
      return functionalViewApi.getFunctionalView(spaceId!); // 실제 연동 시 활성화
    },
    enabled: !!spaceId,
  });

  // 3. 데이터 변환 및 Expand/Collapse 토글 함수 생성
  const toggleNode = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 4. API 데이터와 expandedNodes 상태를 결합하여 화면용 nodes/edges 계산
  useEffect(() => {
    if (!apiData) return;

    // React Flow 포맷으로 변환
    let flowNodes: Node[] = apiData.nodes.map(n => ({
      ...n,
      parentId: n.parentId ?? undefined,
      position: { x: 0, y: 0 }, // 레이아웃 유틸이 재계산함
      data: {
        ...n.data,
        isExpanded: expandedNodes.has(n.id),
        onToggle: toggleNode,
      }
    }));

    let flowEdges: Edge[] = apiData.edges.map(e => ({
      ...e,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
    }));

    // 가시성(hidden) 필터링 로직
    // - Forest는 항상 보임
    // - Tree는 부모 Forest가 expanded 상태여야 보임
    // - Ring은 부모 Tree가 expanded 상태여야 보임
    flowNodes = flowNodes.map(node => {
      let isHidden = false;
      if (node.type === 'treeNode') {
        isHidden = !expandedNodes.has(node.parentId!);
      } else if (node.type === 'ringNode') {
        // Ring 노드의 부모는 Tree 노드. 그 Tree 노드 자체가 hidden인지도 확인해야 완벽함.
        const parentTree = flowNodes.find(n => n.id === node.parentId);
        const parentForestId = parentTree?.parentId;
        
        const isTreeVisible = parentForestId ? expandedNodes.has(parentForestId) : true;
        isHidden = !isTreeVisible || !expandedNodes.has(node.parentId!);
      }
      return { ...node, hidden: isHidden };
    });

    // Dagre 레이아웃 적용
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(flowNodes, flowEdges);

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

  }, [apiData, expandedNodes, setNodes, setEdges, toggleNode]);


  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node as Node<FunctionalNodeData>);
    setIsDrawerOpen(true);
  }, []);

  if (!MOCK_MODE && (spaceId && isApiLoading)) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-medium">로직 구조를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!spaceId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
        <p className="text-lg font-bold text-slate-700">소속된 팀 스페이스가 없습니다.</p>
        <p className="text-slate-500">팀을 생성하거나 참여해주세요.</p>
      </div>
    );
  }

  if (error || !apiData || apiData.nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-200">
          표시할 기능 요소(Functional View) 데이터가 없습니다.<br/>
          <span className="text-sm mt-1 inline-block">AI 파이프라인의 분석이 완료되었는지 확인해주세요.</span>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        className="bg-slate-50/50"
      >
        <Background gap={24} size={2} color="#cbd5e1" className="opacity-50" />
        <Controls className="bg-white border-slate-200 shadow-sm" />
      </ReactFlow>

      <ContextDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        selectedNode={selectedNode}
      />
    </div>
  );
}
