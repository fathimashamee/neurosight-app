/**
 * BackButton — uniform back chevron used across all screens.
 *
 * variant="glass"  → for teal gradient headers  (white semi-transparent)
 * variant="solid"  → for white/light headers     (light grey background)
 *
 * Both share identical dimensions (34 × 34 px, 10 px radius) so the
 * shape is always the same; only the palette changes.
 */
import { useNavigate } from 'react-router-dom'

const STYLES = {
  glass: {
    background:   'rgba(255,255,255,0.16)',
    border:       '1.5px solid rgba(255,255,255,0.32)',
    iconColor:    '#ffffff',
    shadow:       '0 1px 4px rgba(0,0,0,0.12)',
  },
  solid: {
    background:   '#f1f5f9',
    border:       '1.5px solid #e2e8f0',
    iconColor:    '#374151',
    shadow:       '0 1px 3px rgba(0,0,0,0.06)',
  },
}

export default function BackButton({ variant = 'glass', to, onClick }) {
  const navigate = useNavigate()

  function handleClick() {
    if (onClick) { onClick(); return }
    if (to)      { navigate(to); return }
    navigate(-1)
  }

  const s = STYLES[variant] || STYLES.glass

  return (
    <button
      onClick={handleClick}
      aria-label="Go back"
      style={{
        width:           '34px',
        height:          '34px',
        borderRadius:    '10px',
        border:          s.border,
        background:      s.background,
        boxShadow:       s.shadow,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        cursor:          'pointer',
        flexShrink:      0,
        padding:         0,
        WebkitTapHighlightColor: 'transparent',
        transition:      'opacity 0.12s',
      }}
    >
      <svg
        width="18" height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={s.iconColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  )
}
