/* eslint-disable */
// Primitives.jsx — Button, Input, Label, Card, Badge.
// Mirrors shadcn/ui defaults from the source codebase (button.tsx, card.tsx, input.tsx, badge.tsx).

const buttonStyle = (variant, size) => {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    whiteSpace: 'nowrap', borderRadius: 8, fontWeight: 500, fontSize: 14,
    fontFamily: 'inherit', cursor: 'pointer', border: 'none',
    transition: 'background-color 150ms, color 150ms, box-shadow 150ms',
    outline: 'none',
  };
  const sizes = {
    default: { height: 36, padding: '0 16px' },
    sm:      { height: 32, padding: '0 12px', fontSize: 12, borderRadius: 8 },
    lg:      { height: 40, padding: '0 32px', borderRadius: 8 },
    icon:    { height: 36, width: 36, padding: 0 },
  };
  const variants = {
    default:     { background: '#2563eb', color: '#fff', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
    destructive: { background: '#ef4444', color: '#fff', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
    outline:     { background: '#fff',    color: '#0f172a', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
    secondary:   { background: '#f1f5f9', color: '#0f172a', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
    ghost:       { background: 'transparent', color: '#0f172a' },
    link:        { background: 'transparent', color: '#2563eb', padding: 0, height: 'auto', textUnderlineOffset: 4 },
  };
  return { ...base, ...sizes[size || 'default'], ...variants[variant || 'default'] };
};

function Button({ variant = 'default', size = 'default', children, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const base = buttonStyle(variant, size);
  let hoverStyle = {};
  if (hover) {
    if (variant === 'default')        hoverStyle = { background: '#1d4ed8' };
    else if (variant === 'destructive') hoverStyle = { background: '#dc2626' };
    else if (variant === 'outline')   hoverStyle = { background: '#f1f5f9' };
    else if (variant === 'secondary') hoverStyle = { background: '#e2e8f0' };
    else if (variant === 'ghost')     hoverStyle = { background: '#f1f5f9' };
    else if (variant === 'link')      hoverStyle = { textDecoration: 'underline' };
  }
  return (
    <button
      {...rest}
      style={{ ...base, ...hoverStyle, ...style }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >{children}</button>
  );
}

function Input({ style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <input
      {...rest}
      onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }}
      onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
      style={{
        height: 36, padding: '0 12px',
        border: `1px solid ${focus ? '#2563eb' : '#e5e7eb'}`,
        borderRadius: 6, fontSize: 14, fontFamily: 'inherit',
        outline: 'none', background: 'transparent',
        boxShadow: focus ? '0 0 0 1px #2563eb33' : '0 1px 2px 0 rgba(0,0,0,0.05)',
        transition: 'border-color 150ms, box-shadow 150ms',
        ...style,
      }}
    />
  );
}

function Label({ children, htmlFor, style }) {
  return (
    <label htmlFor={htmlFor} style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', ...style }}>
      {children}
    </label>
  );
}

function Card({ children, style, onClick, hoverable }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        boxShadow: hoverable && hover
          ? '0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -4px rgba(0,0,0,0.05)'
          : '0 1px 3px 0 rgba(0,0,0,0.10), 0 1px 2px -1px rgba(0,0,0,0.06)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 150ms',
        ...style,
      }}
    >{children}</div>
  );
}
const CardHeader  = ({ children, style }) => <div style={{ padding: 24, paddingBottom: 0, display: 'flex', flexDirection: 'column', gap: 6, ...style }}>{children}</div>;
const CardTitle   = ({ children, style }) => <h3 style={{ margin: 0, fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em', lineHeight: 1, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, ...style }}>{children}</h3>;
const CardContent = ({ children, style }) => <div style={{ padding: 24, paddingTop: 24, ...style }}>{children}</div>;

function Badge({ children, variant = 'default', style }) {
  const v = {
    default:     { background: '#2563eb', color: '#fff' },
    secondary:   { background: '#3b82f6', color: '#fff' },
    destructive: { background: '#ef4444', color: '#fff' },
    outline:     { background: '#fff', color: '#0f172a', border: '1px solid #e5e7eb' },
    soft:        { background: '#dbeafe', color: '#1d4ed8' },
    success:     { background: '#dcfce7', color: '#15803d' },
    warning:     { background: '#fef3c7', color: '#92400e' },
    danger:      { background: '#fee2e2', color: '#991b1b' },
    neutral:     { background: '#f1f5f9', color: '#475569' },
  }[variant] || v.default;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: 6, fontSize: 11, fontWeight: 600,
      ...v, ...style,
    }}>{children}</span>
  );
}

function Pill({ children, variant = 'neutral', style }) {
  return <Badge variant={variant} style={{ borderRadius: 9999, ...style }}>{children}</Badge>;
}

Object.assign(window, { Button, Input, Label, Card, CardHeader, CardTitle, CardContent, Badge, Pill });
