// One shared shape for loading/empty/error states so every view feels
// considered instead of rendering blank or raw error text.
export default function StatusMessage({ icon = 'ℹ️', title, hint, tone = 'neutral' }) {
  return (
    <div className={`status-message status-${tone}`}>
      <span className="status-icon" aria-hidden="true">
        {icon}
      </span>
      <p className="status-title">{title}</p>
      {hint && <p className="muted status-hint">{hint}</p>}
    </div>
  );
}
