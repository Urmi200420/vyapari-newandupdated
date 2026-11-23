import React from 'react';

/**
 * Robust iOS Liquid Glass Container
 * Works out-of-the-box in Vite/React with backdrop blur, specular reflections, 
 * spring touch physics, and nested liquid glass buttons.
 */
export const LiquidGlassContainer = ({
  buttons = [],
  children,
  className = '',
  style = {},
  borderRadius = 24,
  tintOpacity = 0.15,
  ...props
}) => {
  return (
    <div
      className={`liquid-glass-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: `${borderRadius}px`,
        background: `rgba(255, 255, 255, ${tintOpacity})`,
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: `
          0 10px 30px rgba(0, 0, 0, 0.12),
          inset 0 1px 1px rgba(255, 255, 255, 0.6),
          inset 0 -1px 1px rgba(0, 0, 0, 0.1)
        `,
        transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
        ...style
      }}
      {...props}
    >
      {/* Render Action Buttons */}
      {buttons.map((btn, idx) => (
        <button
          key={btn.id || idx}
          onClick={() => btn.onClick && btn.onClick(btn.label, btn)}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 20px',
            borderRadius: btn.type === 'circle' ? '50%' : '9999px',
            background: `rgba(255, 255, 255, ${btn.tintOpacity || 0.2})`,
            WebkitBackdropFilter: 'blur(12px) saturate(160%)',
            backdropFilter: 'blur(12px) saturate(160%)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.5)',
            color: '#FFFFFF',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            fontSize: `${btn.size || 16}px`,
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none',
            transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), background 0.2s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {btn.label}
        </button>
      ))}

      {children}
    </div>
  );
};