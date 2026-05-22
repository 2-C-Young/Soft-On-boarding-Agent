import { useMemo, useEffect, useState } from 'react';
import { apiFetch } from '../services/apiClient';
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
  try {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    // TB: Top to Bottom (수직 레이아웃), 노드와 랭크(계층) 간격 설정
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120, align: 'UL' });

    nodes.forEach((node) => {
      const width = 288; // w-72는 288px
      const columnsCount = node.data?.columns?.length || 0;
      const height = 70 + columnsCount * 32; // 헤더 영역 + 컬럼 행 높이 합산
      dagreGraph.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => {
      if (edge.source && edge.target) {
        dagreGraph.setEdge(edge.source, edge.target);
      }
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      if (!nodeWithPosition) return node; // 레이아웃 계산 실패 시 원본 반환
      
      const width = 288;
      const columnsCount = node.data?.columns?.length || 0;
      const height = 70 + columnsCount * 32;
      
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - width / 2,
          y: nodeWithPosition.y - height / 2,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  } catch (error) {
    console.error("Dagre 레이아웃 계산 실패, 원본 위치를 유지합니다.", error);
    return { nodes, edges };
  }
};


const nodeTypes = { tableNode: TableNode };
const edgeTypes = { customEdge: CustomEdge };

export function DataView() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);

  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const fetchSchemaData = async () => {
      if (!user?.spaceId) return;

      try {
        setIsLoading(true);
        const response = await apiFetch(`/api/spaces/${user.spaceId}/data-view/schema`);
        
        if (response.ok) {
          const data = await response.json();
          const rawNodes = data.nodes || [];
          const rawEdges = data.edges || [];
          
          // 중복 id를 가진 노드와 엣지를 제거하여 React Flow 키 충돌 방지
          const uniqueNodes = Array.from(new Map(rawNodes.map((n: any) => [n.id, n])).values());
          const uniqueEdges = Array.from(new Map(rawEdges.map((e: any) => [e.id, e])).values());
          
          if (uniqueNodes.length > 0) {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(uniqueNodes, uniqueEdges);
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
          } else {
            setNodes([]);
            setEdges([]);
          }
        } else {
            console.error("Schema fetch returned non-ok status:", response.status);
            setNodes([]);
            setEdges([]);
        }
      } catch (error) {
        console.error("백엔드 API 호출 실패:", error);
        setNodes([]);
        setEdges([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchemaData();
  }, [user?.spaceId, setNodes, setEdges]);

  return (
    <div className="w-full h-full relative overflow-hidden flex">
      {/* Main Diagram Area with React Flow */}
      <div className="flex-1 relative w-full h-full bg-[#FAFAFA]">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/50 backdrop-blur-sm">
            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 font-medium">데이터 모델을 불러오는 중입니다...</p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Database className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">데이터 모델이 없습니다</h3>
            <p className="text-gray-500 max-w-md text-center">
              아직 데이터베이스 스키마 정보가 분석되지 않았거나, 파일에서 데이터 모델을 찾을 수 없습니다. LLM 파이프라인에서 데이터 분석이 완료되었는지 확인해주세요.
            </p>
          </div>
        ) : null}

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
