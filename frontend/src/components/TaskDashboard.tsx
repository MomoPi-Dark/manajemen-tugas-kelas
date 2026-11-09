import type { Pagination, Task, User } from "../types";

interface TaskDashboardProps {
  user: User;
  busyTaskId: string | null;
  tasks: Task[];
  pagination: Pagination;
  loading: boolean;
  error: string | null;
  search: string;
  status: "all" | "pending" | "completed";
  page: number;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: "all" | "pending" | "completed") => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onComplete: (task: Task) => void;
  onLogout: () => void;
}

function formatDueDate(value: string): { date: string; time: string } {
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function TaskDashboard(props: TaskDashboardProps) {
  const isTeacher = props.user.role === "guru";
  const pageCount = Math.max(1, props.pagination.totalPages);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#dashboard" aria-label="Ruang Tugas">
          <span className="brand-mark">T</span>
          <span>
            ruang<span className="brand-accent">tugas</span>
          </span>
        </a>
        <div className="topbar-right">
          <span className="user-role">{isTeacher ? "Guru" : "Siswa"}</span>
          <div className="user-chip">
            <span className={isTeacher ? "avatar avatar-teacher" : "avatar"}>
              {initials(props.user.name)}
            </span>
            <span className="user-name">{props.user.name}</span>
          </div>
          <button
            className="logout-button"
            type="button"
            onClick={props.onLogout}
          >
            Keluar
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-heading">
          <div>
            <span className="eyebrow">RUANG KELAS</span>
            <h1>{isTeacher ? "Kelola tugas kelas" : "Tugas untukmu"}</h1>
            <p>
              {isTeacher
                ? "Buat tugas, atur tenggat, dan pastikan kelas tetap terarah."
                : "Lihat tugas yang perlu diselesaikan dan pantau progresmu."}
            </p>
          </div>
          {isTeacher && (
            <button
              className="button button-primary create-button"
              type="button"
              onClick={props.onCreate}
            >
              <span aria-hidden="true">＋</span> Buat tugas
            </button>
          )}
        </div>

        <section className="task-panel" aria-label="Daftar tugas">
          <div className="task-toolbar">
            <div className="search-field">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <label className="sr-only" htmlFor="task-search">
                Cari tugas berdasarkan judul
              </label>
              <input
                id="task-search"
                type="search"
                value={props.search}
                onChange={(event) => props.onSearchChange(event.target.value)}
                placeholder="Cari judul tugas..."
                maxLength={100}
              />
              {props.search && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() => props.onSearchChange("")}
                  aria-label="Hapus pencarian"
                >
                  ×
                </button>
              )}
            </div>
            {!isTeacher && (
              <div className="filter-field">
                <label className="sr-only" htmlFor="task-status">
                  Filter status tugas
                </label>
                <select
                  id="task-status"
                  value={props.status}
                  onChange={(event) =>
                    props.onStatusChange(
                      event.target.value as "all" | "pending" | "completed",
                    )
                  }
                >
                  <option value="all">Semua status</option>
                  <option value="pending">Belum selesai</option>
                  <option value="completed">Selesai</option>
                </select>
              </div>
            )}
            <span className="result-count">{props.pagination.total} tugas</span>
          </div>

          {props.error && (
            <div className="alert alert-error list-alert" role="alert">
              <span>{props.error}</span>
              <button
                className="text-button"
                type="button"
                onClick={props.onRetry}
              >
                Coba lagi
              </button>
            </div>
          )}

          {props.loading ? (
            <div className="task-loading" role="status" aria-live="polite">
              <span className="spinner spinner-dark" aria-hidden="true" />
              <span>Memuat daftar tugas...</span>
            </div>
          ) : props.tasks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">
                ✳
              </span>
              <h2>
                {props.search || props.status !== "all"
                  ? "Tugas tidak ditemukan"
                  : "Belum ada tugas"}
              </h2>
              <p>
                {props.search || props.status !== "all"
                  ? "Coba ubah kata kunci atau filter yang dipilih."
                  : isTeacher
                    ? "Mulai dengan membuat tugas pertama untuk kelasmu."
                    : "Tugas baru dari guru akan muncul di sini."}
              </p>
              {isTeacher && !props.search && props.status === "all" && (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={props.onCreate}
                >
                  ＋ Buat tugas pertama
                </button>
              )}
            </div>
          ) : (
            <div className="task-list">
              {props.tasks.map((task) => {
                const due = formatDueDate(task.dueAt);
                const overdue =
                  !task.completed &&
                  new Date(task.dueAt).getTime() < Date.now();
                return (
                  <article
                    className={
                      task.completed
                        ? "task-card task-card-complete"
                        : "task-card"
                    }
                    key={task.id}
                  >
                    <div
                      className={
                        task.completed ? "task-check done" : "task-check"
                      }
                      aria-hidden="true"
                    >
                      {task.completed ? "✓" : <span />}
                    </div>
                    <div className="task-content">
                      <div className="task-title-row">
                        <h2>{task.title}</h2>
                        {overdue && (
                          <span className="status-badge status-overdue">
                            Terlambat
                          </span>
                        )}
                        {!isTeacher && (
                          <span
                            className={
                              task.completed
                                ? "status-badge status-complete"
                                : "status-badge status-pending"
                            }
                          >
                            {task.completed ? "Selesai" : "Belum selesai"}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="task-description">{task.description}</p>
                      )}
                      <div className="task-meta">
                        <span className="class-pill">
                          <span className="class-dot" aria-hidden="true" />
                          {task.className}
                        </span>
                        <span className="meta-separator" aria-hidden="true">
                          ·
                        </span>
                        <span>
                          Tenggat {due.date}, {due.time}
                        </span>
                      </div>
                    </div>
                    <div className="task-actions">
                      {isTeacher ? (
                        <>
                          <button
                            className="icon-button"
                            type="button"
                            onClick={() => props.onEdit(task)}
                            disabled={props.busyTaskId === task.id}
                            aria-label={`Ubah tugas ${task.title}`}
                            title="Ubah tugas"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            className="icon-button icon-danger"
                            type="button"
                            onClick={() => props.onDelete(task)}
                            disabled={props.busyTaskId === task.id}
                            aria-label={`Hapus tugas ${task.title}`}
                            title="Hapus tugas"
                          >
                            <TrashIcon />
                          </button>
                        </>
                      ) : (
                        !task.completed && (
                          <button
                            className="button button-complete"
                            type="button"
                            onClick={() => props.onComplete(task)}
                            disabled={props.busyTaskId === task.id}
                          >
                            {props.busyTaskId === task.id
                              ? "Menyimpan..."
                              : "Tandai selesai"}{" "}
                            <span aria-hidden="true">✓</span>
                          </button>
                        )
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!props.loading && props.pagination.total > 0 && (
            <nav className="pagination" aria-label="Navigasi halaman tugas">
              <span>
                Halaman {props.page} dari {pageCount}
              </span>
              <div className="pagination-actions">
                <button
                  className="button button-quiet"
                  type="button"
                  onClick={() => props.onPageChange(props.page - 1)}
                  disabled={props.page <= 1}
                >
                  ← Sebelumnya
                </button>
                <button
                  className="button button-quiet"
                  type="button"
                  onClick={() => props.onPageChange(props.page + 1)}
                  disabled={props.page >= pageCount}
                >
                  Berikutnya →
                </button>
              </div>
            </nav>
          )}
        </section>

        <footer className="dashboard-footer">
          <span>ruangtugas</span>
          <span>Belajar, setahap demi setahap.</span>
        </footer>
      </main>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m14 5 5 5M4 20l4-.8L19 8a2.12 2.12 0 0 0-3-3L5 16z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}
