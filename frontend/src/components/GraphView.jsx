import React, { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Handle, 
  Position,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { buildGraphFromPillars, getLayoutedElements } from '../utils/graphUtils';
import { fetchProjectSemanticLinks } from '../services/apiService';

const DecisionNode = ({ data }) => {
  const isResolved = !!data.answer;
  const isConflict = !!data.conflict;
  const isFeature = data.kind === 'feature';
  
  const nodeStyle = {
    padding: '10px 15px',
    borderRadius: '8px',
    background: isConflict
      ? 'var(--color-conflict-bg)'
      : (isFeature ? 'var(--color-resolved-bg)' : (isResolved ? 'var(--accent-subtle)' : 'var(--bg-tertiary)')),
    border: `2px solid ${isConflict ? 'var(--color-conflict)' : (isFeature ? 'var(--color-resolved)' : (isResolved ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.3)'))}`,
    color: 'var(--text-primary)',
    fontSize: '12px',
    fontWeight: '500',
    width: '180px',
    textAlign: 'center',
    boxShadow: isConflict ? '0 0 20px var(--color-conflict-bg)' : 'none',
    transition: 'all 0.2s ease-in-out',
    backdropFilter: 'blur(10px)',
  };

  return (
    <div style={nodeStyle}>
      <Handle type="target" position={Position.Top} style={{ background: 'var(--text-secondary)' }} />
      <div style={{ marginBottom: '4px', opacity: 0.7, fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {data.pillarTitle}
      </div>
      <div style={{ wordBreak: 'break-word', color: 'var(--text-primary)' }}>{data.label}</div>
      {isFeature && !isConflict && (
        <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--color-resolved)', fontWeight: 'bold' }}>
          FEATURE {data.priority ? `· ${data.priority}` : ''}
        </div>
      )}
      {isConflict && (
        <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--color-conflict)', fontWeight: 'bold' }}>
          CONFLICT
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--text-secondary)' }} />
    </div>
  );
};

const GraphView = ({ pillars, projectId, onSelectDecision }) => {
  const nodeTypes = useMemo(() => ({
    decision: DecisionNode,
  }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    console.log('GraphView: pillars updated', pillars?.length);
    if (!pillars || pillars.length === 0) return;

    let cancelled = false;
    const applyGraph = async () => {
      const { nodes: rawNodes, edges: rawEdges } = buildGraphFromPillars(pillars);
      if (rawNodes.length === 0) return;

      let semanticEdges = [];
      if (projectId) {
        try {
          const semantic = await fetchProjectSemanticLinks(projectId, 0.62, 2);
          const links = Array.isArray(semantic?.links) ? semantic.links : [];
          const existing = new Set(rawEdges.map((edge) => {
            const [left, right] = [edge.source, edge.target].sort();
            return `${left}::${right}`;
          }));
          semanticEdges = links
            .filter((link) => link?.sourceId && link?.targetId && link.sourceId !== link.targetId)
            .filter((link) => !existing.has([link.sourceId, link.targetId].sort().join('::')))
            .map((link, idx) => ({
              id: `semantic-${link.sourceId}-${link.targetId}-${idx}`,
              source: link.sourceId,
              target: link.targetId,
              label: `${Math.round((link.score || 0) * 100)}% semantic`,
              style: {
                stroke: 'var(--color-resolved)',
                strokeWidth: 1.7,
                strokeDasharray: '4,4'
              },
              markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-resolved)' },
              animated: false
            }));
        } catch {
          semanticEdges = [];
        }
      }

      if (cancelled) return;
      const mergedEdges = [...rawEdges, ...semanticEdges];
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, mergedEdges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    };

    applyGraph();
    return () => { cancelled = true; };
  }, [pillars, projectId, setNodes, setEdges]);

  const onNodeClick = useCallback((event, node) => {
    if (onSelectDecision) {
      onSelectDecision(node.data.pillarId, node.id);
    }
  }, [onSelectDecision]);

  return (
    <div className="glass-panel" style={{ height: '100%', width: '100%', minHeight: '600px', position: 'relative', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
      <div style={{ position: 'absolute', top: '15px', left: '20px', zIndex: 5, pointerEvents: 'none' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-heading)' }}>Decision Topology</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {nodes.length > 0 ? `Interactive visualization of ${nodes.length} decisions (structural + semantic)` : 'Generating graph...'}
        </p>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Background color="#333" gap={20} variant="dots" />
        <Controls />
        <MiniMap
            nodeColor={(node) => {
                if (node.data.conflict) return 'var(--color-conflict)';
                if (node.data.kind === 'feature') return 'var(--color-resolved)';
                if (node.data.answer) return 'var(--accent-color)';
                return '#666';
            }}
            maskColor="rgba(0,0,0,0.6)"
            style={{ background: 'var(--bg-primary)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
      </ReactFlow>
    </div>
  );
};

export default GraphView;
