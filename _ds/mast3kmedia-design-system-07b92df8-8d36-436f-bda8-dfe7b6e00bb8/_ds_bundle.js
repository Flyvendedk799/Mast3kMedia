/* @ds-bundle: {"format":3,"namespace":"Mast3kMediaDesignSystem_07b92d","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"Progress","sourcePath":"components/feedback/Progress.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Nav","sourcePath":"components/navigation/Nav.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"f501b6c3c4ff","components/core/Badge.jsx":"66666def0554","components/core/Button.jsx":"535c75c1ad1f","components/core/Card.jsx":"c61a14ae3ff4","components/core/Tag.jsx":"ef0b2b92cf97","components/feedback/Alert.jsx":"550676622e0e","components/feedback/Progress.jsx":"d8978da2bcd2","components/forms/Input.jsx":"63c0a5cb74b7","components/forms/Select.jsx":"9360ef1dfc8d","components/navigation/Nav.jsx":"107f56e306ce"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.Mast3kMediaDesignSystem_07b92d = window.Mast3kMediaDesignSystem_07b92d || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Avatar({
  size = 'md',
  initials,
  src,
  alt,
  style: extraStyle,
  ...props
}) {
  const sizes = {
    sm: {
      width: '32px',
      height: '32px',
      fontSize: '12px'
    },
    md: {
      width: '48px',
      height: '48px',
      fontSize: '16px'
    },
    lg: {
      width: '64px',
      height: '64px',
      fontSize: '22px'
    },
    xl: {
      width: '96px',
      height: '96px',
      fontSize: '32px'
    }
  };
  const base = {
    borderRadius: 'var(--radius-full)',
    background: 'var(--color-surface-2)',
    border: '2px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    fontFamily: 'var(--font-display)',
    fontWeight: 'var(--weight-bold)',
    color: 'var(--color-green)',
    ...sizes[size],
    ...extraStyle
  };
  if (src) {
    return /*#__PURE__*/React.createElement("img", _extends({
      src: src,
      alt: alt || '',
      style: {
        ...base,
        objectFit: 'cover'
      }
    }, props));
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    style: base
  }, props), initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Badge({
  variant = 'neutral',
  dot = false,
  children,
  style: extraStyle,
  ...props
}) {
  const variants = {
    green: {
      color: 'var(--color-green)',
      bg: 'rgba(0,255,136,0.08)',
      border: 'rgba(0,255,136,0.2)',
      dot: 'var(--color-green)'
    },
    cyan: {
      color: 'var(--color-cyan)',
      bg: 'rgba(0,207,255,0.08)',
      border: 'rgba(0,207,255,0.2)',
      dot: 'var(--color-cyan)'
    },
    neutral: {
      color: 'var(--color-muted)',
      bg: 'var(--color-surface-2)',
      border: 'var(--color-border)',
      dot: 'var(--color-muted)'
    },
    error: {
      color: 'var(--color-error)',
      bg: 'rgba(255,80,96,0.08)',
      border: 'rgba(255,80,96,0.2)',
      dot: 'var(--color-error)'
    },
    warning: {
      color: 'var(--color-warning)',
      bg: 'rgba(255,181,71,0.08)',
      border: 'rgba(255,181,71,0.2)',
      dot: 'var(--color-warning)'
    }
  };
  const v = variants[variant] || variants.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontFamily: 'var(--font-mono)',
      fontSize: '9px',
      fontWeight: 'var(--weight-regular)',
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      padding: '4px 11px',
      borderRadius: 'var(--radius-full)',
      border: '1px solid',
      whiteSpace: 'nowrap',
      lineHeight: '1',
      color: v.color,
      background: v.bg,
      borderColor: v.border,
      ...extraStyle
    }
  }, props), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: '5px',
      height: '5px',
      borderRadius: '50%',
      background: v.dot,
      flexShrink: 0
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
function Button({
  variant = 'primary',
  size = 'md',
  children,
  disabled = false,
  onClick,
  href,
  type = 'button',
  style: extraStyle,
  ...props
}) {
  const [hovered, setHovered] = useState(false);
  const sizeMap = {
    sm: {
      fontSize: '12px',
      padding: '8px 18px'
    },
    md: {
      fontSize: '14px',
      padding: '12px 28px'
    },
    lg: {
      fontSize: '16px',
      padding: '16px 36px'
    },
    xl: {
      fontSize: '18px',
      padding: '20px 48px',
      borderRadius: 'var(--radius-lg)',
      letterSpacing: '0.06em'
    }
  };
  const variantMap = {
    primary: {
      background: hovered && !disabled ? '#1AFFAA' : 'var(--color-green)',
      color: 'var(--color-void)',
      borderColor: hovered && !disabled ? '#1AFFAA' : 'var(--color-green)',
      boxShadow: hovered && !disabled ? 'var(--shadow-green)' : 'none',
      transform: hovered && !disabled ? 'translateY(-1px)' : 'none'
    },
    secondary: {
      background: hovered && !disabled ? 'rgba(0,255,136,0.08)' : 'transparent',
      color: 'var(--color-green)',
      borderColor: 'var(--color-green)',
      boxShadow: hovered && !disabled ? 'var(--shadow-green)' : 'none',
      transform: hovered && !disabled ? 'translateY(-1px)' : 'none'
    },
    ghost: {
      background: hovered && !disabled ? 'var(--color-surface-2)' : 'transparent',
      color: hovered && !disabled ? 'var(--color-white)' : 'var(--color-muted)',
      borderColor: hovered && !disabled ? 'var(--color-muted)' : 'var(--color-border)'
    },
    cyan: {
      background: hovered && !disabled ? 'rgba(0,207,255,0.08)' : 'transparent',
      color: 'var(--color-cyan)',
      borderColor: 'var(--color-cyan)',
      boxShadow: hovered && !disabled ? 'var(--shadow-cyan)' : 'none',
      transform: hovered && !disabled ? 'translateY(-1px)' : 'none'
    },
    destructive: {
      background: hovered && !disabled ? 'rgba(255,80,96,0.18)' : 'rgba(255,80,96,0.1)',
      color: 'var(--color-error)',
      borderColor: 'rgba(255,80,96,0.3)',
      transform: hovered && !disabled ? 'translateY(-1px)' : 'none'
    }
  };
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: 'var(--font-display)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: '0.04em',
    borderRadius: 'var(--radius-full)',
    border: '1.5px solid transparent',
    textDecoration: 'none',
    transition: 'all var(--transition-base)',
    whiteSpace: 'nowrap',
    lineHeight: '1',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    outline: 'none',
    ...sizeMap[size],
    ...variantMap[variant],
    ...extraStyle
  };
  const Tag = href ? 'a' : 'button';
  return /*#__PURE__*/React.createElement(Tag, _extends({
    type: href ? undefined : type,
    href: href,
    disabled: Tag === 'button' ? disabled : undefined,
    onClick: !disabled ? onClick : undefined,
    onMouseEnter: () => !disabled && setHovered(true),
    onMouseLeave: () => setHovered(false),
    style: base
  }, props), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
function Card({
  variant = 'default',
  interactive = false,
  children,
  style: extraStyle,
  ...props
}) {
  const [hovered, setHovered] = useState(false);
  const glow = interactive && hovered;
  const base = {
    background: glow ? 'var(--color-surface-2)' : 'var(--color-surface)',
    border: '1px solid',
    borderColor: glow ? 'rgba(0,255,136,0.2)' : variant === 'accent' ? 'rgba(0,255,136,0.25)' : 'var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-6)',
    transition: 'background var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base)',
    boxShadow: glow ? 'var(--shadow-green)' : 'none',
    position: 'relative',
    overflow: 'hidden',
    ...extraStyle
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: base,
    onMouseEnter: () => interactive && setHovered(true),
    onMouseLeave: () => setHovered(false)
  }, props), variant === 'accent' && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '2px',
      background: 'linear-gradient(to right, var(--color-green), var(--color-cyan))'
    }
  }), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
function Tag({
  active = false,
  children,
  onClick,
  style: extraStyle,
  ...props
}) {
  const [hovered, setHovered] = useState(false);
  const isOn = active || hovered;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      padding: '5px 13px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid',
      transition: 'all var(--transition-fast)',
      cursor: onClick ? 'pointer' : 'default',
      background: isOn ? 'rgba(0,255,136,0.06)' : 'var(--color-surface-2)',
      color: isOn ? 'var(--color-green)' : 'var(--color-muted)',
      borderColor: isOn ? 'var(--color-green)' : 'var(--color-border)',
      userSelect: 'none',
      ...extraStyle
    },
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onClick: onClick
  }, props), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Alert({
  variant = 'success',
  title,
  children,
  icon,
  style: extraStyle,
  ...props
}) {
  const variants = {
    success: {
      color: 'var(--color-green)',
      bg: 'rgba(0,255,136,0.06)',
      border: 'rgba(0,255,136,0.2)',
      body: 'rgba(0,255,136,0.7)',
      icon: '✓'
    },
    info: {
      color: 'var(--color-cyan)',
      bg: 'rgba(0,207,255,0.06)',
      border: 'rgba(0,207,255,0.2)',
      body: 'rgba(0,207,255,0.7)',
      icon: '↗'
    },
    warning: {
      color: 'var(--color-warning)',
      bg: 'rgba(255,181,71,0.06)',
      border: 'rgba(255,181,71,0.2)',
      body: 'rgba(255,181,71,0.7)',
      icon: '⚠'
    },
    error: {
      color: 'var(--color-error)',
      bg: 'rgba(255,80,96,0.06)',
      border: 'rgba(255,80,96,0.2)',
      body: 'rgba(255,80,96,0.7)',
      icon: '✕'
    }
  };
  const v = variants[variant] || variants.success;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      padding: '16px 24px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid',
      borderColor: v.border,
      background: v.bg,
      color: v.color,
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-relaxed)',
      ...extraStyle
    }
  }, props), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '16px',
      flexShrink: 0,
      marginTop: '1px'
    }
  }, icon || v.icon), /*#__PURE__*/React.createElement("div", null, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-sm)',
      marginBottom: children ? '3px' : 0
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      color: v.body
    }
  }, children)));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Progress.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Progress({
  value = 0,
  max = 100,
  variant = 'green',
  style: extraStyle,
  ...props
}) {
  const pct = Math.min(100, Math.max(0, value / max * 100));
  const fills = {
    green: 'var(--color-green)',
    cyan: 'var(--color-cyan)',
    gradient: 'linear-gradient(to right, var(--color-green), var(--color-cyan))'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      height: '4px',
      background: 'var(--color-surface-3)',
      borderRadius: 'var(--radius-full)',
      overflow: 'hidden',
      ...extraStyle
    },
    role: "progressbar",
    "aria-valuenow": value,
    "aria-valuemin": 0,
    "aria-valuemax": max
  }, props), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${pct}%`,
      background: fills[variant] || fills.green,
      borderRadius: 'var(--radius-full)',
      transition: 'width var(--transition-slow)'
    }
  }));
}
Object.assign(__ds_scope, { Progress });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Progress.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
function Input({
  label,
  hint,
  error,
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled = false,
  style: extraStyle,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-caption)',
      color: 'var(--color-muted)',
      letterSpacing: '0.2em',
      textTransform: 'uppercase'
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    placeholder: placeholder,
    value: value,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    style: {
      background: 'var(--color-surface-2)',
      border: '1px solid',
      borderColor: error ? 'var(--color-error)' : focused ? 'var(--color-green)' : hovered ? 'var(--color-muted)' : 'var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-body)',
      color: 'var(--color-white)',
      outline: 'none',
      transition: 'border-color var(--transition-base), box-shadow var(--transition-base)',
      width: '100%',
      boxShadow: focused ? error ? '0 0 0 3px rgba(255,80,96,0.2)' : 'var(--shadow-green)' : 'none',
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'text',
      ...extraStyle
    }
  }, props)), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: error ? 'var(--color-error)' : 'var(--color-muted)'
    }
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
function Select({
  label,
  hint,
  children,
  disabled = false,
  style: extraStyle,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-caption)',
      color: 'var(--color-muted)',
      letterSpacing: '0.2em',
      textTransform: 'uppercase'
    }
  }, label), /*#__PURE__*/React.createElement("select", _extends({
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      background: 'var(--color-surface-2)',
      border: '1px solid',
      borderColor: focused ? 'var(--color-green)' : 'var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 40px 12px 16px',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-body)',
      color: 'var(--color-white)',
      outline: 'none',
      cursor: 'pointer',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236A6A82' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 16px center',
      width: '100%',
      transition: 'border-color var(--transition-base)',
      opacity: disabled ? 0.5 : 1,
      ...extraStyle
    }
  }, props), children), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: 'var(--color-muted)'
    }
  }, hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Nav.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
function NavLink({
  children,
  href = '#',
  active = false
}) {
  const [hovered, setHovered] = useState(false);
  return /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: href,
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-caption)',
      color: active ? 'var(--color-white)' : hovered ? 'var(--color-green)' : 'var(--color-muted)',
      textDecoration: 'none',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      transition: 'color var(--transition-base)'
    },
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false)
  }, children));
}
function Nav({
  links = [],
  cta,
  logo = true,
  sticky = false,
  style: extraStyle,
  ...props
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '18px 32px',
      background: 'rgba(7,7,10,0.85)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid var(--color-border)',
      position: sticky ? 'sticky' : 'relative',
      top: sticky ? 0 : undefined,
      zIndex: sticky ? 'var(--z-sticky)' : undefined,
      height: 'var(--nav-height)',
      ...extraStyle
    }
  }, props), logo && /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      textDecoration: 'none',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "24",
    height: "24",
    viewBox: "0 0 100 100",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M14 84 L14 16 L50 52 L86 16 L86 84",
    stroke: "#00FF88",
    strokeWidth: "11",
    strokeLinejoin: "miter",
    strokeLinecap: "butt"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-bold)',
      fontSize: '14px',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: 'var(--color-white)'
    }
  }, "MAST", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-green)'
    }
  }, "3"), "KMEDIA")), links.length > 0 && /*#__PURE__*/React.createElement("ul", {
    style: {
      display: 'flex',
      gap: '48px',
      listStyle: 'none',
      margin: 0,
      padding: 0
    }
  }, links.map((link, i) => /*#__PURE__*/React.createElement(NavLink, {
    key: i,
    href: link.href,
    active: link.active
  }, link.label))), cta && /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0
    }
  }, cta));
}
Object.assign(__ds_scope, { Nav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Nav.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Progress = __ds_scope.Progress;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Nav = __ds_scope.Nav;

})();
