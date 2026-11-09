import { useState, type SubmitEvent } from "react";
import type { AuthInput, SchoolClass } from "../types";

interface AuthScreenProps {
  mode: "login" | "register";
  onModeChange: (mode: "login" | "register") => void;
  classes: SchoolClass[];
  classesLoading: boolean;
  classesError: string | null;
  submitting: boolean;
  error: string | null;
  onRetryClasses: () => void;
  onSubmit: (input: AuthInput) => Promise<void>;
}

export function AuthScreen({
  mode,
  onModeChange,
  classes,
  classesLoading,
  classesError,
  submitting,
  error,
  onRetryClasses,
  onSubmit,
}: AuthScreenProps) {
  const [role, setRole] = useState<"guru" | "siswa">("siswa");

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (mode === "login") {
      void onSubmit({ action: "login", email, password });
      return;
    }

    if (role === "guru") {
      void onSubmit({
        action: "register",
        name,
        email,
        password,
        role,
        teacherRegistrationCode: String(
          form.get("teacherRegistrationCode") ?? "",
        ),
        className: String(form.get("className") ?? "").trim(),
      });
      return;
    }

    void onSubmit({
      action: "register",
      name,
      email,
      password,
      role,
      classId: String(form.get("classId") ?? ""),
    });
  }

  const studentCannotRegister =
    mode === "register" && role === "siswa" && classes.length === 0;

  return (
    <main className="auth-page">
      <section
        className="auth-story"
        aria-label="Tentang Manajemen Tugas Kelas"
      >
        <a
          className="brand brand-light"
          href="/sign"
          aria-label="Class Task Tracker"
        >
          <span className="brand-mark">T</span>
          <span>
            ruang<span className="brand-accent">tugas</span>
          </span>
        </a>
        <div className="story-copy">
          <span className="eyebrow eyebrow-light">CLASS TASK TRACKER</span>
          <h1>Belajar lebih terarah, satu tugas dalam satu waktu.</h1>
          <p>
            Tempat guru membagikan tugas dan siswa melihat apa yang perlu
            diselesaikan.
          </p>
        </div>
        <div className="story-note">
          <span className="story-note-icon" aria-hidden="true">
            ✳
          </span>
          <p>Rapi untuk guru. Jelas untuk siswa.</p>
        </div>
        <div className="story-orbit orbit-one" aria-hidden="true" />
        <div className="story-orbit orbit-two" aria-hidden="true" />
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <a
            className="brand brand-mobile"
            href="/sign"
            aria-label="Class Task Tracker"
          >
            <span className="brand-mark">T</span>
            <span>
              ruang<span className="brand-accent">tugas</span>
            </span>
          </a>
          <div className="auth-heading">
            <span className="eyebrow">SELAMAT DATANG</span>
            <h2>{mode === "login" ? "Masuk ke akunmu" : "Buat akun baru"}</h2>
            <p>
              {mode === "login"
                ? "Lanjutkan mengelola aktivitas kelas."
                : "Mulai kelola tugas kelas dengan mudah."}
            </p>
          </div>

          <div
            className="auth-tabs"
            role="tablist"
            aria-label="Jenis autentikasi"
          >
            <button
              className={mode === "login" ? "auth-tab active" : "auth-tab"}
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => onModeChange("login")}
            >
              Masuk
            </button>
            <button
              className={mode === "register" ? "auth-tab active" : "auth-tab"}
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              onClick={() => onModeChange("register")}
            >
              Daftar
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "register" && (
              <>
                <div className="field">
                  <label htmlFor="name">Nama lengkap</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Contoh: Nabila Putri"
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    required
                  />
                </div>
                <fieldset className="role-picker">
                  <legend>Daftar sebagai</legend>
                  <label
                    className={
                      role === "siswa" ? "role-option selected" : "role-option"
                    }
                  >
                    <input
                      type="radio"
                      name="role"
                      value="siswa"
                      checked={role === "siswa"}
                      onChange={() => setRole("siswa")}
                    />
                    <span className="role-icon" aria-hidden="true">
                      S
                    </span>
                    <span>
                      <strong>Siswa</strong>
                      <small>Lihat dan selesaikan tugas</small>
                    </span>
                  </label>
                  <label
                    className={
                      role === "guru" ? "role-option selected" : "role-option"
                    }
                  >
                    <input
                      type="radio"
                      name="role"
                      value="guru"
                      checked={role === "guru"}
                      onChange={() => setRole("guru")}
                    />
                    <span className="role-icon teacher-icon" aria-hidden="true">
                      G
                    </span>
                    <span>
                      <strong>Guru</strong>
                      <small>Kelola tugas kelas</small>
                    </span>
                  </label>
                </fieldset>
              </>
            )}

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="nama@email.com"
                maxLength={254}
                autoComplete="email"
                required
              />
            </div>

            <div className="field">
              <div className="field-label-row">
                <label htmlFor="password">Password</label>
                {mode === "register" && (
                  <span className="field-hint">Minimal 12 karakter</span>
                )}
              </div>
              <input
                id="password"
                name="password"
                type="password"
                placeholder={
                  mode === "login"
                    ? "Masukkan password"
                    : "Buat password yang kuat"
                }
                minLength={mode === "register" ? 12 : 1}
                maxLength={128}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required
              />
            </div>

            {mode === "register" && role === "siswa" && (
              <div className="field">
                <div className="field-label-row">
                  <label htmlFor="classId">Kelas</label>
                  {classesError && (
                    <button
                      className="text-button"
                      type="button"
                      onClick={onRetryClasses}
                    >
                      Coba lagi
                    </button>
                  )}
                </div>
                <select
                  id="classId"
                  name="classId"
                  defaultValue=""
                  required
                  disabled={classesLoading || classes.length === 0}
                >
                  <option value="" disabled>
                    {classesLoading ? "Memuat kelas..." : "Pilih kelas"}
                  </option>
                  {classes.map((classroom) => (
                    <option value={classroom.id} key={classroom.id}>
                      {classroom.name}
                    </option>
                  ))}
                </select>
                {classesError && <p className="field-error">{classesError}</p>}
                {!classesLoading && !classesError && classes.length === 0 && (
                  <p className="field-hint">
                    Belum ada kelas. Minta guru mendaftarkan kelas terlebih
                    dahulu.
                  </p>
                )}
              </div>
            )}

            {mode === "register" && role === "guru" && (
              <>
                <div className="field">
                  <label htmlFor="className">Nama kelas pertama</label>
                  <input
                    id="className"
                    name="className"
                    type="text"
                    placeholder="Contoh: 7A"
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="teacherRegistrationCode">
                    Kode pendaftaran guru
                  </label>
                  <input
                    id="teacherRegistrationCode"
                    name="teacherRegistrationCode"
                    type="password"
                    placeholder="Masukkan kode dari penyelenggara"
                    autoComplete="off"
                    required
                  />
                  <p className="field-hint">
                    Kode ini diberikan oleh administrator sekolah.
                  </p>
                </div>
              </>
            )}

            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}

            <button
              className="button button-primary auth-submit"
              type="submit"
              disabled={submitting || studentCannotRegister}
            >
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Memproses...
                </>
              ) : mode === "login" ? (
                "Masuk"
              ) : (
                "Buat akun"
              )}
              {!submitting && <span aria-hidden="true">→</span>}
            </button>
          </form>
          <p className="auth-legal">
            Dengan melanjutkan, pastikan kamu menggunakan akun yang sesuai
            dengan peranmu.
          </p>
        </div>
      </section>
    </main>
  );
}
