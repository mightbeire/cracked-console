import { navigationItems, type AppSection } from "./navigation";

export function Sidebar({
  active,
  onNavigate,
}: {
  active: AppSection;
  onNavigate: (section: AppSection) => void;
}) {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="brand">Cracked Console</div>
      <nav className="nav-list">
        {navigationItems.map((item) => (
          <button
            className={`nav-item ${item.id === active ? "nav-item-active" : ""}`}
            key={item.id}
            onClick={() => onNavigate(item.id)}
            type="button"
          >
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">Community Edition / Local First</div>
    </aside>
  );
}
