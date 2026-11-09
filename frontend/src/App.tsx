import { useEffect, useState } from "react";
import { apiRequest, ApiError, getData } from "./api";
import { AuthScreen } from "./components/AuthScreen";
import { TaskDashboard } from "./components/TaskDashboard";
import { TaskForm } from "./components/TaskForm";
import type {
  ApiEnvelope,
  AuthInput,
  SchoolClass,
  Task,
  TaskInput,
  TaskList,
  User,
} from "./types";
import "./App.css";

const TOKEN_KEY = "ruangtugas-token";
const PAGE_SIZE = 10;
type AppRoute = "/sign" | "/signup" | "/dashboard";
const APP_ROUTES: AppRoute[] = ["/sign", "/signup", "/dashboard"];

function readRoute(): AppRoute {
  const path = window.location.pathname;
  return APP_ROUTES.includes(path as AppRoute) ? (path as AppRoute) : "/sign";
}

function navigateTo(path: AppRoute, replace = false) {
  window.history[replace ? "replaceState" : "pushState"](null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

interface AuthResult {
  user: User;
  token: string;
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(readRoute);
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<User | null>(null);
  const [restoringSession, setRestoringSession] = useState(() =>
    Boolean(sessionStorage.getItem(TOKEN_KEY)),
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [classesRetry, setClassesRetry] = useState(0);
  const [teacherClasses, setTeacherClasses] = useState<SchoolClass[]>([]);
  const [teacherClassesLoading, setTeacherClassesLoading] = useState(false);
  const [teacherClassesError, setTeacherClassesError] = useState<string | null>(
    null,
  );

  const [tasks, setTasks] = useState<Task[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "completed">("all");
  const [page, setPage] = useState(1);
  const [refreshTasks, setRefreshTasks] = useState(0);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const onPopState = () => setRoute(readRoute());
    window.addEventListener("popstate", onPopState);
    if (!APP_ROUTES.includes(window.location.pathname as AppRoute)) {
      navigateTo("/sign", true);
    }
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (token && user && route !== "/dashboard") {
      navigateTo("/dashboard", true);
    } else if (!token && route === "/dashboard") {
      navigateTo("/sign", true);
    }
  }, [route, token, user]);

  useEffect(() => {
    let active = true;
    setClassesLoading(true);
    setClassesError(null);
    apiRequest<ApiEnvelope<SchoolClass[]>>("/classes")
      .then((response) => {
        if (active) setClasses(response.data);
      })
      .catch((error: unknown) => {
        if (active) setClassesError(errorMessage(error));
      })
      .finally(() => {
        if (active) setClassesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [classesRetry]);

  useEffect(() => {
    if (!token || user?.role !== "guru") return;
    let active = true;
    setTeacherClassesLoading(true);
    setTeacherClassesError(null);
    apiRequest<ApiEnvelope<SchoolClass[]>>("/classes/mine", {}, token)
      .then((response) => {
        if (active) setTeacherClasses(response.data);
      })
      .catch((error: unknown) => {
        if (active) setTeacherClassesError(errorMessage(error));
      })
      .finally(() => {
        if (active) setTeacherClassesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, user?.id, user?.role]);

  useEffect(() => {
    if (!token) {
      setRestoringSession(false);
      return;
    }
    let active = true;
    apiRequest<ApiEnvelope<{ user: User }>>("/auth/me", {}, token)
      .then((response) => {
        if (active) setUser(response.data.user);
      })
      .catch(() => {
        if (active) {
          sessionStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
          setAuthError("Sesi berakhir. Silakan masuk kembali.");
        }
      })
      .finally(() => {
        if (active) setRestoringSession(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!token || !user) {
      setTasks([]);
      return;
    }
    let active = true;
    const query = new URLSearchParams({
      search: debouncedSearch,
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (user.role === "siswa" && status !== "all") query.set("status", status);

    setTasksLoading(true);
    setTasksError(null);
    apiRequest<ApiEnvelope<TaskList>>(`/tasks?${query.toString()}`, {}, token)
      .then((response) => {
        if (!active) return;
        setTasks(response.data.data);
        setPagination(response.data.pagination);
        if (
          response.data.pagination.totalPages > 0 &&
          page > response.data.pagination.totalPages
        ) {
          setPage(response.data.pagination.totalPages);
        }
      })
      .catch((error: unknown) => {
        if (active) setTasksError(errorMessage(error));
      })
      .finally(() => {
        if (active) setTasksLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    token,
    user?.id,
    user?.role,
    debouncedSearch,
    status,
    page,
    refreshTasks,
  ]);

  async function handleAuth(input: AuthInput) {
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      let result: AuthResult;
      if (input.action === "login") {
        result = await getData<AuthResult>("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: input.email,
            password: input.password,
          }),
        });
      } else {
        const body =
          input.role === "guru"
            ? {
                name: input.name,
                email: input.email,
                password: input.password,
                role: input.role,
                teacherRegistrationCode: input.teacherRegistrationCode,
                className: input.className,
              }
            : {
                name: input.name,
                email: input.email,
                password: input.password,
                role: input.role,
                classId: input.classId,
              };
        result = await getData<AuthResult>("/auth/register", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      sessionStorage.setItem(TOKEN_KEY, result.token);
      setUser(result.user);
      setToken(result.token);
      navigateTo("/dashboard", true);
      setPage(1);
    } catch (error) {
      setAuthError(errorMessage(error));
    } finally {
      setAuthSubmitting(false);
    }
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setTasks([]);
    setTeacherClasses([]);
    setTeacherClassesError(null);
    setAuthError(null);
    navigateTo("/sign", true);
    setSearch("");
    setStatus("all");
  }

  function openCreateForm() {
    setEditingTask(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(task: Task) {
    setEditingTask(task);
    setFormError(null);
    setFormOpen(true);
  }

  async function saveTask(input: TaskInput) {
    if (!token) return;
    setFormSaving(true);
    setFormError(null);
    try {
      if (editingTask) {
        await apiRequest(
          `/tasks/${editingTask.id}`,
          { method: "PATCH", body: JSON.stringify(input) },
          token,
        );
      } else {
        await apiRequest(
          "/tasks",
          { method: "POST", body: JSON.stringify(input) },
          token,
        );
      }
      setFormOpen(false);
      setEditingTask(null);
      setRefreshTasks((value) => value + 1);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setFormSaving(false);
    }
  }

  async function deleteTask(task: Task) {
    if (
      !token ||
      !window.confirm(
        `Hapus tugas “${task.title}”? Tindakan ini tidak dapat dibatalkan.`,
      )
    )
      return;
    setBusyTaskId(task.id);
    setTasksError(null);
    try {
      await apiRequest(`/tasks/${task.id}`, { method: "DELETE" }, token);
      setRefreshTasks((value) => value + 1);
    } catch (error) {
      setTasksError(errorMessage(error));
    } finally {
      setBusyTaskId(null);
    }
  }

  async function completeTask(task: Task) {
    if (!token) return;
    setBusyTaskId(task.id);
    setTasksError(null);
    try {
      await apiRequest(
        `/tasks/${task.id}/complete`,
        { method: "PATCH" },
        token,
      );
      setRefreshTasks((value) => value + 1);
    } catch (error) {
      setTasksError(errorMessage(error));
    } finally {
      setBusyTaskId(null);
    }
  }

  if (restoringSession && !user) {
    return (
      <div className="app-loading" role="status">
        <span className="spinner spinner-dark" />
        Memeriksa sesi...
      </div>
    );
  }

  if (!token || !user) {
    return (
      <AuthScreen
        mode={route === "/signup" ? "register" : "login"}
        onModeChange={(mode) =>
          navigateTo(mode === "login" ? "/sign" : "/signup")
        }
        classes={classes}
        classesLoading={classesLoading}
        classesError={classesError}
        submitting={authSubmitting}
        error={authError}
        onRetryClasses={() => setClassesRetry((value) => value + 1)}
        onSubmit={handleAuth}
      />
    );
  }

  return (
    <>
      <TaskDashboard
        user={user}
        tasks={tasks}
        pagination={pagination}
        loading={tasksLoading}
        error={tasksError}
        search={search}
        status={status}
        page={page}
        busyTaskId={busyTaskId}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        onPageChange={setPage}
        onRetry={() => setRefreshTasks((value) => value + 1)}
        onCreate={openCreateForm}
        onEdit={openEditForm}
        onDelete={deleteTask}
        onComplete={completeTask}
        onLogout={logout}
      />
      {formOpen && user.role === "guru" && (
        <TaskForm
          classes={teacherClasses}
          classesLoading={teacherClassesLoading}
          classesError={teacherClassesError}
          task={editingTask}
          saving={formSaving}
          error={formError}
          onClose={() => {
            setFormOpen(false);
            setEditingTask(null);
          }}
          onSubmit={saveTask}
        />
      )}
    </>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan. Silakan coba lagi.";
}
