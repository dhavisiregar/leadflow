import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Kanban, CheckSquare, AlertCircle } from "lucide-react";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "../../api";

const POLL_MS = 45000;

const TYPE_ICON = {
  task_due: CheckSquare,
  task_overdue: AlertCircle,
  lead_stale: Kanban,
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Where a notification's related entity opens — reuses the same query-param
// convention the global search dropdown uses to deep-link into a page.
function entityPath(n) {
  if (n.related_entity_type === "lead" && n.related_entity_id) return `/pipeline?lead=${n.related_entity_id}`;
  if (n.related_entity_type === "task" && n.related_entity_id) return `/tasks?highlight=${n.related_entity_id}`;
  return null;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    getNotifications()
      .then((res) => {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleClick = async (n) => {
    if (!n.is_read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await markNotificationRead(n.id);
      } catch {}
    }
    setOpen(false);
    const path = entityPath(n);
    if (path) navigate(path);
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {}
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1.5"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 card max-h-96 overflow-y-auto z-50 py-1.5">
          <div className="flex items-center justify-between px-3 py-1.5 mb-1 border-b border-gray-100 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium"
              >
                <Check size={11} /> Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">You're all caught up!</p>
          ) : (
            notifications.map((n) => {
              const Icon = TYPE_ICON[n.type] || Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    !n.is_read ? "bg-brand-50/50 dark:bg-brand-900/10" : ""
                  }`}
                >
                  <Icon size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{n.title}</p>
                    {n.message && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{n.message}</p>
                    )}
                    <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
