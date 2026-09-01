export default function Toast({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <p>{t.message}</p>
          {t.list?.length > 0 && (
            <ul className="toast-list">
              {t.list.slice(0, 10).map((name, i) => <li key={i}>{name}</li>)}
              {t.list.length > 10 && <li className="toast-list-more">and {t.list.length - 10} more</li>}
            </ul>
          )}
          <button className="toast-close" onClick={() => onDismiss(t.id)} aria-label="Dismiss">×</button>
        </div>
      ))}
    </div>
  );
}
