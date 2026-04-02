import { useState, useEffect, useMemo } from 'react';

export default function ViewTransition({ viewKey, children }) {
  const [transition, setTransition] = useState({
    phase: 'entering',
    displayedKey: viewKey,
    displayedChildren: children,
    targetKey: viewKey
  });

  // Derive whether we need to start a new transition
  const needsTransition = viewKey !== transition.targetKey;

  // When viewKey changes, kick off exit → enter cycle
  useEffect(() => {
    if (!needsTransition) return;

    const nextKey = viewKey;
    const nextChildren = children;

    // Use setTimeout to start the exit phase, then chain the enter
    const kickoff = setTimeout(() => {
      setTransition(prev => ({ ...prev, phase: 'exiting', targetKey: nextKey }));
    }, 0);

    const exitTimer = setTimeout(() => {
      setTransition(prev => ({
        ...prev,
        phase: 'entering',
        displayedKey: nextKey,
        displayedChildren: nextChildren
      }));
    }, 180);

    return () => {
      clearTimeout(kickoff);
      clearTimeout(exitTimer);
    };
  }, [needsTransition, viewKey, children]);

  // Finish enter → idle
  useEffect(() => {
    if (transition.phase !== 'entering') return;
    const timer = setTimeout(() => {
      setTransition(prev => ({ ...prev, phase: 'idle' }));
    }, 220);
    return () => clearTimeout(timer);
  }, [transition.phase]);

  // For same-key prop updates, show latest children directly
  const showChildren = viewKey === transition.displayedKey ? children : transition.displayedChildren;

  const className = useMemo(() => {
    if (transition.phase === 'exiting') return 'view-transition view-exit';
    if (transition.phase === 'entering') return 'view-transition view-enter';
    return 'view-transition';
  }, [transition.phase]);

  return (
    <div className={className} key={transition.displayedKey} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {showChildren}
    </div>
  );
}
