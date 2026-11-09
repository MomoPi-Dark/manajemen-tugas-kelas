import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { app } from "../src/app.ts";
import { config } from "../src/config.ts";
import { migrateDatabase } from "../src/db/migrate.ts";
import { dbPool } from "../src/db/pool.ts";

const runId = randomUUID();
const teacherEmail = `test-teacher-${runId}@example.test`;
const studentEmail = `test-student-${runId}@example.test`;
const otherTeacherEmail = `test-other-teacher-${runId}@example.test`;
const otherStudentEmail = `test-other-student-${runId}@example.test`;
const teacherPassword = "TestPassword-1-Long";

let teacherToken = "";
let studentToken = "";
let otherTeacherToken = "";
let studentClassId = "";
let teacherTaskId = "";
let otherTaskId = "";
const testClassName = `Test Class ${runId}`;
const otherClassName = `Other Test Class ${runId}`;

describe("Class Task Tracker REST API", () => {
	beforeAll(async () => {
		if (process.env.NODE_ENV !== "test" || !process.env.TEST_DATABASE_URL) {
			throw new Error(
				"API tests require NODE_ENV=test and a separate TEST_DATABASE_URL.",
			);
		}
		await migrateDatabase();

		const teacher = await request(app).post("/api/auth/register").send({
			name: "Test Teacher",
			email: teacherEmail,
			password: teacherPassword,
			role: "guru",
			teacherRegistrationCode: config.TEACHER_REGISTRATION_CODE,
			className: testClassName,
		});
		expect(teacher.status).toBe(201);
		teacherToken = teacher.body.data.token;

		const classList = await request(app).get("/api/classes");
		studentClassId = classList.body.data.find(
			(item: { name: string }) => item.name === testClassName,
		).id;

		const student = await request(app).post("/api/auth/register").send({
			name: "Test Student",
			email: studentEmail,
			password: teacherPassword,
			classId: studentClassId,
		});
		expect(student.status).toBe(201);
		studentToken = student.body.data.token;

		const otherTeacher = await request(app).post("/api/auth/register").send({
			name: "Other Test Teacher",
			email: otherTeacherEmail,
			password: teacherPassword,
			role: "guru",
			teacherRegistrationCode: config.TEACHER_REGISTRATION_CODE,
			className: otherClassName,
		});
		expect(otherTeacher.status).toBe(201);
		otherTeacherToken = otherTeacher.body.data.token;

		const otherClassList = await request(app).get("/api/classes");
		const otherClassId = otherClassList.body.data.find(
			(item: { name: string }) => item.name === otherClassName,
		).id;
		const otherStudent = await request(app).post("/api/auth/register").send({
			name: "Other Test Student",
			email: otherStudentEmail,
			password: teacherPassword,
			classId: otherClassId,
		});
		expect(otherStudent.status).toBe(201);

		const task = await request(app)
			.post("/api/tasks")
			.set("Authorization", `Bearer ${teacherToken}`)
			.send({
				title: "Integration test task",
				description: "Task used by endpoint tests",
				dueAt: new Date(Date.now() + 86_400_000).toISOString(),
				classId: studentClassId,
			});
		expect(task.status).toBe(201);
		teacherTaskId = task.body.data.id;

		const otherTask = await request(app)
			.post("/api/tasks")
			.set("Authorization", `Bearer ${otherTeacherToken}`)
			.send({
				title: "Other class private task",
				dueAt: new Date(Date.now() + 86_400_000).toISOString(),
				classId: otherClassId,
			});
		expect(otherTask.status).toBe(201);
		otherTaskId = otherTask.body.data.id;
	});

	it("registers and logs in users without returning password hashes", async () => {
		const login = await request(app)
			.post("/api/auth/login")
			.send({ email: studentEmail, password: teacherPassword });
		expect(login.status).toBe(200);
		expect(login.body.data.user).not.toHaveProperty("password_hash");
		expect(login.body.data.user.role).toBe("siswa");

		const me = await request(app)
			.get("/api/auth/me")
			.set("Authorization", `Bearer ${studentToken}`);
		expect(me.status).toBe(200);
		expect(me.body.data.user.email).toBe(studentEmail);
	});

	it("rejects public teacher registration without the invite code", async () => {
		const result = await request(app)
			.post("/api/auth/register")
			.send({
				name: "Uninvited Teacher",
				email: `uninvited-${runId}@example.test`,
				password: teacherPassword,
				role: "guru",
				className: "Unapproved class",
			});
		expect(result.status).toBe(400);
	});

	it("prevents students from creating, changing, or deleting tasks", async () => {
		const create = await request(app)
			.post("/api/tasks")
			.set("Authorization", `Bearer ${studentToken}`)
			.send({
				title: "Forbidden",
				dueAt: new Date().toISOString(),
				classId: studentClassId,
			});
		expect(create.status).toBe(403);

		const update = await request(app)
			.patch(`/api/tasks/${teacherTaskId}`)
			.set("Authorization", `Bearer ${studentToken}`)
			.send({ title: "Changed" });
		expect(update.status).toBe(403);

		const remove = await request(app)
			.delete(`/api/tasks/${teacherTaskId}`)
			.set("Authorization", `Bearer ${studentToken}`);
		expect(remove.status).toBe(403);
	});

	it("searches, filters, and paginates only tasks in the student's class", async () => {
		const result = await request(app)
			.get("/api/tasks?search=Integration&status=pending&page=1&limit=1")
			.set("Authorization", `Bearer ${studentToken}`);
		expect(result.status).toBe(200);
		expect(result.body.data.data).toHaveLength(1);
		expect(result.body.data.data[0].id).toBe(teacherTaskId);
		expect(result.body.data.pagination.page).toBe(1);
		expect(result.body.data.pagination.limit).toBe(1);
		expect(result.body.data.pagination.total).toBe(1);

		const allTasks = await request(app)
			.get("/api/tasks")
			.set("Authorization", `Bearer ${studentToken}`);
		expect(
			allTasks.body.data.data.some(
				(task: { id: string }) => task.id === otherTaskId,
			),
		).toBe(false);
	});

	it("allows a student to mark a task complete idempotently and filter by status", async () => {
		const first = await request(app)
			.patch(`/api/tasks/${teacherTaskId}/complete`)
			.set("Authorization", `Bearer ${studentToken}`);
		const repeated = await request(app)
			.patch(`/api/tasks/${teacherTaskId}/complete`)
			.set("Authorization", `Bearer ${studentToken}`);
		expect(first.status).toBe(200);
		expect(repeated.status).toBe(200);
		expect(repeated.body.data.completed).toBe(true);

		const completed = await request(app)
			.get("/api/tasks?status=completed")
			.set("Authorization", `Bearer ${studentToken}`);
		expect(
			completed.body.data.data.map((task: { id: string }) => task.id),
		).toContain(teacherTaskId);
	});

	it("allows only the owning teacher to update and delete a task", async () => {
		const forbidden = await request(app)
			.patch(`/api/tasks/${teacherTaskId}`)
			.set("Authorization", `Bearer ${otherTeacherToken}`)
			.send({ title: "Unauthorized change" });
		expect(forbidden.status).toBe(404);

		const updated = await request(app)
			.patch(`/api/tasks/${teacherTaskId}`)
			.set("Authorization", `Bearer ${teacherToken}`)
			.send({ title: "Updated integration task" });
		expect(updated.status).toBe(200);
		expect(updated.body.data.title).toBe("Updated integration task");

		const deleted = await request(app)
			.delete(`/api/tasks/${teacherTaskId}`)
			.set("Authorization", `Bearer ${teacherToken}`);
		expect(deleted.status).toBe(204);
	});

	afterAll(async () => {
		await dbPool.query(
			"DELETE FROM task_completions WHERE task_id = ANY($1::uuid[])",
			[[teacherTaskId, otherTaskId].filter(Boolean)],
		);
		await dbPool.query("DELETE FROM tasks WHERE id = ANY($1::uuid[])", [
			[teacherTaskId, otherTaskId].filter(Boolean),
		]);
		await dbPool.query("DELETE FROM users WHERE email = ANY($1::text[])", [
			[studentEmail, otherStudentEmail],
		]);
		await dbPool.query("DELETE FROM classes WHERE name = ANY($1::text[])", [
			[testClassName, otherClassName],
		]);
		await dbPool.query("DELETE FROM users WHERE email = ANY($1::text[])", [
			[teacherEmail, otherTeacherEmail],
		]);
	});
});
