import { Plus, MessageSquare, Trash2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isOpen,
  setIsOpen
}: {
  sessions: any[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession?: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden" 
          onClick={() => setIsOpen(false)} 
        />
      )}
      
      <div className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[var(--background)] border-r border-[var(--border)] transform transition-transform duration-200 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 flex items-center justify-between border-b border-[var(--border)]">
          <button
            onClick={onNewChat}
            className="flex-1 flex items-center gap-2 bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--text-primary)] px-4 py-2 rounded-lg transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            New Chat
          </button>
          <button 
            className="ml-2 p-2 md:hidden text-[var(--text-secondary)]" 
            onClick={() => setIsOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {sessions.length === 0 ? (
            <div className="text-xs text-[var(--text-secondary)] text-center mt-4">
              No chat history yet.
            </div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  onSelectSession(session.id);
                  if (window.innerWidth < 768) setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors group ${
                  activeSessionId === session.id
                    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
                }`}
              >
                <MessageSquare size={16} className="shrink-0" />
                <div className="flex-1 truncate">
                  <div className="truncate font-medium">
                    {session.id.slice(0, 8)}... {/* Default title if none */}
                  </div>
                  <div className="text-[10px] opacity-70">
                    {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
