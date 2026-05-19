import { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  EdgeLabelRenderer,
  BaseEdge,
  getSmoothStepPath,
  Handle,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { User, ShoppingCart, FileText, Database } from 'lucide-react';

const TableNode = ({ data }: any) => {
  const Icon = data.icon;
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
  id,
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

const initialNodes = [
  {
    id: 'users',
    type: 'tableNode',
    position: { x: 150, y: 120 },
    data: {
      title: 'Users Table',
      icon: User,
      columns: [
        { name: 'id', type: 'UUID (PK)' },
        { name: 'email', type: 'String (Unique)' },
        { name: 'name', type: 'String' },
        { name: 'created_at', type: 'Timestamp', badge: '1 : N' },
      ],
    },
  },
  {
    id: 'orders',
    type: 'tableNode',
    position: { x: 150, y: 400 },
    data: {
      title: 'Orders Table',
      icon: ShoppingCart,
      columns: [
        { name: 'id', type: 'UUID (PK)' },
        { name: 'user_id', type: 'UUID (FK)' },
        { name: 'total_amount', type: 'Decimal' },
        { name: 'status', type: 'Enum' },
      ],
    },
  },
  {
    id: 'payment',
    type: 'tableNode',
    position: { x: 520, y: 400 },
    data: {
      title: 'Payment Log',
      icon: FileText,
      columns: [
        { name: 'id', type: 'UUID (PK)' },
        { name: 'order_id', type: 'UUID (FK)' },
        { name: 'method', type: 'String' },
        { name: 'success', type: 'Boolean' },
      ],
    },
  },
];

const initialEdges = [
  {
    id: 'e-users-orders',
    source: 'users',
    target: 'orders',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    type: 'customEdge',
    data: {
      label: 'Handover',
      labelClassName:
        'bg-blue-100 text-blue-800 text-[10px] font-semibold px-3 py-1 rounded-full border border-blue-200 z-10',
    },
  },
  {
    id: 'e-orders-payment',
    source: 'orders',
    target: 'payment',
    sourceHandle: 'right',
    targetHandle: 'left',
    type: 'customEdge',
    data: {
      label: '1 : 1',
      labelClassName: 'bg-white text-gray-500 text-xs font-medium px-2 py-0.5 rounded shadow-sm border border-gray-100 z-10',
    },
  },
];

export function DataView() {
  const nodeTypes = useMemo(() => ({ tableNode: TableNode }), []);
  const edgeTypes = useMemo(() => ({ customEdge: CustomEdge }), []);

  return (
    <div className="w-full h-full relative overflow-hidden flex">
      {/* Main Diagram Area with React Flow */}
      <div className="flex-1 relative w-full h-full">
        <ReactFlow
          nodes={initialNodes}
          edges={initialEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.5, includeHiddenNodes: true }}
          minZoom={0.5}
          maxZoom={2}
          className="bg-dot-pattern"
          nodesDraggable={false} // Adjust as needed
          panOnDrag={true}
          zoomOnScroll={true}
        >
          <Background color="#E5E7EB" gap={16} size={1} />
          <Controls className="mb-4 ml-4" />
        </ReactFlow>
      </div>

      {/* Right Sidebar - Data Analysis & Tasks */}
      <div className="absolute top-8 right-8 w-80 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 p-6 z-20 flex flex-col max-h-[calc(100vh-64px)] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-2 leading-tight">Data Analysis &<br />Tasks</h2>
        <p className="text-sm text-gray-500 mb-8">Pending schema optimizations.</p>

        {/* To-Do Items */}
        <div className="mb-8">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">To-Do Items</h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="mt-0.5 w-4 h-4 rounded border border-gray-300 flex-shrink-0 bg-white"></div>
              <span className="text-sm text-gray-700 leading-snug">Add missing indexing on User.email</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-0.5 w-4 h-4 rounded bg-gray-900 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="text-sm text-gray-400 line-through leading-snug">Check cascading deletes on Order items</span>
            </li>
          </ul>
        </div>

        {/* Critical Schema Files */}
        <div className="mb-8">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Critical Schema Files</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-mono text-gray-700">prisma/schema.prisma</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
              <Database className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-mono text-gray-700">migrations/init.sql</span>
            </div>
          </div>
        </div>

        {/* Preview: Schema.prisma */}
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Preview: Schema.prisma</h3>
          <div className="bg-[#2D2D2D] rounded-xl p-4 overflow-x-auto shadow-inner">
            <pre className="text-[11px] font-mono leading-relaxed">
              <span className="text-[#c678dd]">model</span> <span className="text-[#e5c07b] font-bold">User</span> {'{\n'}
              <span className="text-[#e06c75]">  id</span>      <span className="text-[#56b6c2]">String</span> <span className="text-gray-500">@id @default(...)</span>{'\n'}
              <span className="text-[#e06c75]">  email</span>   <span className="text-[#56b6c2]">String</span> <span className="text-gray-500">@unique</span>{'\n'}
              <span className="text-[#e06c75]">  name</span>    <span className="text-[#56b6c2]">String?</span>{'\n'}
              <span className="text-[#e06c75]">  orders</span>  <span className="text-[#56b6c2]">Order[]</span>{'\n'}
              <span className="text-[#abb2bf]">{'}'}</span>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
