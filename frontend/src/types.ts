export type UserRole = "guru" | "siswa";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  classId: string | null;
}

export interface SchoolClass {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  classId: string;
  className: string;
  teacherId: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TaskList {
  data: Task[];
  pagination: Pagination;
}

export interface ApiEnvelope<T> {
  data: T;
}

export interface LoginInput {
  action: "login";
  email: string;
  password: string;
}

export interface StudentRegistrationInput {
  action: "register";
  name: string;
  email: string;
  password: string;
  role: "siswa";
  classId: string;
}

export interface TeacherRegistrationInput {
  action: "register";
  name: string;
  email: string;
  password: string;
  role: "guru";
  teacherRegistrationCode: string;
  className: string;
}

export type AuthInput =
  | LoginInput
  | StudentRegistrationInput
  | TeacherRegistrationInput;

export interface TaskInput {
  title: string;
  description: string | null;
  dueAt: string;
  classId: string;
}
