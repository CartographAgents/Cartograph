import React, { useState, useEffect } from 'react';
import { Icon, loadIcon } from '@iconify/react';

// Memory cache for the current session
const iconCache = new Map();

/**
 * DynamicIcon
 * 
 * A production-ready component for Just-In-Time (JIT) icon loading.
 * Fetches icon data from Iconify API only when needed.
 * 
 * @param {string} name - Iconify name (e.g., "mdi:home", "fa6-brands:node-js")
 * @param {number|string} size - Width and height of the icon
 * @param {string} className - Optional CSS class
 * @param {object} style - Optional inline styles
 */
const DynamicIcon = ({ 
  name, 
  size = 20, 
  className = '', 
  style = {} 
}) => {
  const [iconData, setIconData] = useState(iconCache.get(name) || null);
  const [loading, setLoading] = useState(!iconData);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!name) return;

    if (iconCache.has(name)) {
      setIconData(iconCache.get(name));
      setLoading(false);
      return;
    }

    setLoading(true);
    setFailed(false);

    loadIcon(name)
      .then((data) => {
        if (!mounted) return;
        iconCache.set(name, data);
        setIconData(data);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setFailed(true);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [name]);

  const placeholderStyle = {
    display: 'inline-block',
    width: size,
    height: size,
    backgroundColor: 'var(--border-color, rgba(0,0,0,0.1))',
    borderRadius: '4px',
    ...style
  };

  if (failed) {
    return (
      <span 
        className={`icon-failed ${className}`} 
        style={{ ...placeholderStyle, backgroundColor: 'rgba(255,0,0,0.05)' }}
        title={`Failed to load icon: ${name}`}
      />
    );
  }

  if (loading || !iconData) {
    return (
      <span 
        className={`icon-loading animate-pulse ${className}`} 
        style={{ 
          ...placeholderStyle,
          opacity: 0.5
        }} 
      />
    );
  }

  return (
    <Icon 
      icon={iconData} 
      width={size} 
      height={size} 
      className={className} 
      style={style} 
    />
  );
};

export default DynamicIcon;
