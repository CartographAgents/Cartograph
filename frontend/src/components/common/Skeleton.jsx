import React from 'react';

function SkeletonLine({ width = '100%', height = '14px', style }) {
    return (
        <div
            className="skeleton-line"
            style={{ width, height, ...style }}
        />
    );
}

function SkeletonCard() {
    return (
        <div className="skeleton-card">
            <SkeletonLine width="45%" height="18px" />
            <SkeletonLine width="96%" />
            <SkeletonLine width="72%" />
        </div>
    );
}

export default function Skeleton({ variant = 'card', count = 1 }) {
    const items = Array.from({ length: count }, (_, i) => i);

    if (variant === 'line') {
        return (
            <div className="skeleton-group">
                {items.map((i) => <SkeletonLine key={i} />)}
            </div>
        );
    }

    return (
        <div className="skeleton-group">
            {items.map((i) => <SkeletonCard key={i} />)}
        </div>
    );
}
