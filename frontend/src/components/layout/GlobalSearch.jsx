import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Kanban, User as UserIcon, CheckSquare } from "lucide-react";
import { globalSearch } from "../../api";

function ResultGroup({ label, icon: Icon, children }) {
  return (
    <div className="mb-1 last:mb-0">
      <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        <Icon size={10} /> {label}
      </div>
      {children}
    </div>
  );
}

function ResultRow({ title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <p className="text-sm text-gray-900 dark:text-white truncate">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{subtitle}</p>}
    </button>
  );
}

// Topbar search: debounced query across leads/contacts/tasks, results shown
// as a grouped dropdown overlay. Clicking a result navigates to the page
// that owns that item and asks it (via a query param) to open/highlight it.
export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      globalSearch(q)
        .then((res) => setResults(res.data))
        .catch(() => setResults(null))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const go = (path) => {
    setOpen(false);
    setQuery("");
    setResults(null);
    navigate(path);
  };

  const hasResults =
    results && (results.leads.length > 0 || results.contacts.length > 0 || results.tasks.length > 0);

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          className="input pl-9 pr-8"
          placeholder="Search leads, contacts, tasks..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults(null);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 mt-1.5 card max-h-96 overflow-y-auto z-50 py-1.5">
          {loading ? (
            <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">Searching...</p>
          ) : !hasResults ? (
            <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">
              No results for &quot;{query}&quot;
            </p>
          ) : (
            <>
              {results.leads.length > 0 && (
                <ResultGroup label="Leads" icon={Kanban}>
                  {results.leads.map((l) => (
                    <ResultRow
                      key={`lead-${l.id}`}
                      title={l.title}
                      subtitle={l.stage?.name}
                      onClick={() => go(`/pipeline?lead=${l.id}`)}
                    />
                  ))}
                </ResultGroup>
              )}
              {results.contacts.length > 0 && (
                <ResultGroup label="Contacts" icon={UserIcon}>
                  {results.contacts.map((c) => (
                    <ResultRow
                      key={`contact-${c.id}`}
                      title={c.name}
                      subtitle={c.email || c.company}
                      onClick={() => go(`/contacts?highlight=${c.id}`)}
                    />
                  ))}
                </ResultGroup>
              )}
              {results.tasks.length > 0 && (
                <ResultGroup label="Tasks" icon={CheckSquare}>
                  {results.tasks.map((t) => (
                    <ResultRow
                      key={`task-${t.id}`}
                      title={t.title}
                      subtitle={t.is_completed ? "Completed" : t.due_date ? new Date(t.due_date).toLocaleDateString() : null}
                      onClick={() => go(`/tasks?highlight=${t.id}`)}
                    />
                  ))}
                </ResultGroup>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
