import { useMemo, useEffect, useState } from 'react';
import axios from 'axios';
import ReactFlow, {
  Background,
  Controls,
  EdgeLabelRenderer,
  BaseEdge,
  getSmoothStepPath,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { User, ShoppingCart, FileText, Database, Table as TableIcon } from 'lucide-react';
import dagre from 'dagre';
import { useAuthStore } from '../store/authStore';

const iconMap: Record<string, any> = {
  User: User,
  ShoppingCart: ShoppingCart,
  FileText: FileText,
  Database: Database,
  Table: TableIcon
};

const TableNode = ({ data }: any) => {
  const Icon = (typeof data.icon === 'string' ? iconMap[data.icon] : data.icon) || TableIcon;
  return (
    <div className="w-72 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-gray-200">
      <Handle type="target" position={Position.Top} id="top" className="opacity-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="opacity-0" />
      <Handle type="target" position={Position.Left} id="left" className="opacity-0" />
      <Handle type="source" position={Position.Right} id="right" className="opacity-0" />

      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-gray-700" />
        </div>
        <span className="text-base font-semibold text-gray-900">{data.title}</span>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {data.columns.map((col: any, idx: number) => (
          <div key={idx} className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{col.name}</span>
              {col.badge && (
                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold tracking-wider">
                  {col.badge}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 font-mono">{col.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CustomEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: any) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: 2, stroke: '#E5E7EB' }} />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={data.labelClassName}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const getLayoutedElements = (nodes: any[], edges: any[]) => {
  if (nodes.length === 0) return { nodes, edges };

  // 1. 무방향 인접 리스트 생성 (연결 컴포넌트를 찾기 위함)
  const adj = new Map<string, string[]>();
  nodes.forEach(node => adj.set(node.id, []));
  edges.forEach(edge => {
    if (adj.has(edge.source) && adj.has(edge.target)) {
      adj.get(edge.source)!.push(edge.target);
      adj.get(edge.target)!.push(edge.source);
    }
  });

  // 2. BFS 탐색을 통한 연결 컴포넌트(Connected Components) 추출
  const visited = new Set<string>();
  const components: string[][] = [];

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const component: string[] = [];
      const queue = [node.id];
      visited.add(node.id);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        component.push(curr);

        const neighbors = adj.get(curr) || [];
        neighbors.forEach(neighbor => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        });
      }
      components.push(component);
    }
  });

  // 테이블 수가 많은 중요도가 높은 그룹을 우선 배치
  components.sort((a, b) => b.length - a.length);

  // 3. 각 컴포넌트별 개별 dagre 레이아웃 수행 및 그리드 정렬
  const layoutedNodes: any[] = [];
  const COLUMNS = 2; // 가로 최대 2개의 테이블 뭉치 배치
  const GROUP_GAP_X = 250; // 그룹 간 X축 간격
  const GROUP_GAP_Y = 200; // 그룹 간 Y축 간격

  let currentGroupX = 0;
  let currentGroupY = 0;
  let maxRowHeight = 0;
  let colIndex = 0;

  components.forEach((compNodeIds) => {
    const compNodes = nodes.filter(n => compNodeIds.includes(n.id));
    const compEdges = edges.filter(e => compNodeIds.includes(e.source) && compNodeIds.includes(e.target));

    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 100, align: 'UL' });

    compNodes.forEach(node => {
      const width = 288; // w-72는 288px
      const columnsCount = node.data?.columns?.length || 0;
      const height = 70 + columnsCount * 32;
      g.setNode(node.id, { width, height });
    });

    compEdges.forEach(edge => {
      g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);

    // 컴포넌트 내 노드들의 상대적 경계 박스 계산
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    const tempLayouted: any[] = [];

    compNodes.forEach(node => {
      const dNode = g.node(node.id);
      const width = 288;
      const columnsCount = node.data?.columns?.length || 0;
      const height = 70 + columnsCount * 32;

      const rx = dNode.x - width / 2;
      const ry = dNode.y - height / 2;

      minX = Math.min(minX, rx);
      maxX = Math.max(maxX, rx + width);
      minY = Math.min(minY, ry);
      maxY = Math.max(maxY, ry + height);

      tempLayouted.push({ node, rx, ry });
    });

    const compWidth = maxX - minX;
    const compHeight = maxY - minY;

    // 열 인덱스가 허용치를 넘어가면 줄바꿈 처리
    if (colIndex >= COLUMNS) {
      currentGroupX = 0;
      currentGroupY += maxRowHeight + GROUP_GAP_Y;
      maxRowHeight = 0;
      colIndex = 0;
    }

    // 그룹별 시작 원점(currentGroupX, currentGroupY)에 오프셋 적용하여 절대좌표 설정
    tempLayouted.forEach(item => {
      layoutedNodes.push({
        ...item.node,
        position: {
          x: currentGroupX + (item.rx - minX),
          y: currentGroupY + (item.ry - minY),
        }
      });
    });

    maxRowHeight = Math.max(maxRowHeight, compHeight);
    currentGroupX += compWidth + GROUP_GAP_X;
    colIndex++;
  });

  return { nodes: layoutedNodes, edges };
};

export function DataView() {
  const nodeTypes = useMemo(() => ({ tableNode: TableNode }), []);
  const edgeTypes = useMemo(() => ({ customEdge: CustomEdge }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);

  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const fetchSchemaData = async () => {
      if (!user?.spaceId || !token) return;

      setIsLoading(true);
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL 
          ? import.meta.env.VITE_API_BASE_URL 
          : (import.meta.env.DEV ? 'http://localhost:8080' : '');

        const response = await axios.get(
          `${API_BASE}/api/spaces/${user.spaceId}/data-view/schema`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.data) {
          const rawNodes = response.data.nodes || [];
          const rawEdges = response.data.edges || [];

          if (rawNodes.length > 0) {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges);
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
          } else {
            setNodes([]);
            setEdges([]);
          }
        }
      } catch (error) {
        console.error("백엔드 API 호출 실패, 기본 더미 데이터를 유지합니다.", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchemaData();
  }, [user?.spaceId, token, setNodes, setEdges]);

  return (
    <div className="w-full h-full relative overflow-hidden flex">
      {/* Main Diagram Area with React Flow */}
      <div className="flex-1 relative w-full h-full">
        {isLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#FAFAFA]/80 backdrop-blur-sm">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-medium text-gray-900">데이터 스키마를 불러오고 있습니다...</p>
            <p className="text-xs text-gray-500 mt-2">프로젝트 크기에 따라 약간의 시간이 소요될 수 있습니다.</p>
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.5, includeHiddenNodes: true }}
          minZoom={0.5}
          maxZoom={2}
          className="bg-dot-pattern"
          nodesDraggable={true}
          panOnDrag={true}
          zoomOnScroll={true}
        >
          <Background color="#E5E7EB" gap={16} size={1} />
          <Controls className="mb-4 ml-4" />
        </ReactFlow>
      </div>
    </div>
  );
}
