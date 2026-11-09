import { useEffect, useState, type SubmitEvent } from "react";
import type { SchoolClass, Task, TaskInput } from "../types";

interface TaskFormProps {
  classes: SchoolClass[];
  classesLoading: boolean;
  classesError: string | null;
  task?: Task | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: TaskInput) => Promise<void>;
}

function toLocalDateTime(value?: string): string {
  const date = value
    ? new Date(value)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function TaskForm({
  classes,
  classesLoading,
  classesError,
  task,
  saving,
  error,
  onClose,
  onSubmit,
}: TaskFormProps) {
  const [classId, setClassId] = useState(task?.classId ?? "");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onSubmit({
      title: String(form.get("title") ?? "").trim(),
      description: String(form.get("description") ?? "").trim() || null,
      dueAt: new Date(String(form.get("dueAt"))).toISOString(),
      classId: String(form.get("classId") ?? ""),
    });
  }

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        className="task-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
      >
        <div className="dialog-header">
          <div>
            <span className="eyebrow">TUGAS KELAS</span>
            <h2 id="task-dialog-title">
              {task ? "Ubah tugas" : "Buat tugas baru"}
            </h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Tutup form"
            onClick={onClose}
            disabled={saving}
          >
            ×
          </button>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="task-title">Judul tugas</label>
            <input
              id="task-title"
              name="title"
              defaultValue={task?.title ?? ""}
              placeholder="Contoh: Latihan pecahan"
              maxLength={160}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="task-description">
              Deskripsi <span className="optional-label">Opsional</span>
            </label>
            <textarea
              id="task-description"
              name="description"
              defaultValue={task?.description ?? ""}
              placeholder="Tambahkan petunjuk atau detail tugas..."
              maxLength={10_000}
              rows={4}
            />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="task-due-at">Tenggat</label>
              <input
                id="task-due-at"
                name="dueAt"
                type="datetime-local"
                defaultValue={toLocalDateTime(task?.dueAt)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="task-class">Kelas</label>
              <select
                id="task-class"
                name="classId"
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                required
                disabled={
                  classesLoading ||
                  classesError !== null ||
                  classes.length === 0
                }
              >
                <option value="" disabled>
                  {classesLoading ? "Memuat kelas..." : "Pilih kelas"}
                </option>
                {classes.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {classesError && (
            <div className="alert alert-error" role="alert">
              Gagal memuat daftar kelas: {classesError}
            </div>
          )}
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          <div className="dialog-actions">
            <button
              className="button button-quiet"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Batal
            </button>
            <button
              className="button button-primary"
              type="submit"
              disabled={
                saving ||
                classesLoading ||
                classesError !== null ||
                classes.length === 0
              }
            >
              {saving ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Menyimpan...
                </>
              ) : task ? (
                "Simpan perubahan"
              ) : (
                "Buat tugas"
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
