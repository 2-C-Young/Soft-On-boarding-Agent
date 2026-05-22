import { useMemo, useEffect } from 'react';
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
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
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
};

export function DataView() {
  const nodeTypes = useMemo(() => ({ tableNode: TableNode }), []);
  const edgeTypes = useMemo(() => ({ customEdge: CustomEdge }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const fetchSchemaData = async () => {
      if (!user?.spaceId || !token) return;

      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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
      }
    };

    fetchSchemaData();
  }, [user?.spaceId, token, setNodes, setEdges]);

  return (
    <div className="w-full h-full relative overflow-hidden flex">
      {/* Main Diagram Area with React Flow */}
      <div className="flex-1 relative w-full h-full">
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
