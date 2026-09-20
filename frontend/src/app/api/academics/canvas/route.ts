type CanvasCourse = {
  id: number;
  name?: string;
  course_code?: string;
  syllabus_body?: string;
  teachers?: { display_name?: string; email?: string }[];
};
type CanvasAssignment = {
  name?: string;
  due_at?: string | null;
  points_possible?: number | null;
  description?: string | null;
};

const strip = (html = "") =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export async function GET() {
  const base = process.env.CANVAS_BASE_URL?.replace(/\/$/, "");
  const token = process.env.CANVAS_ACCESS_TOKEN;
  if (!base || !token)
    return Response.json(
      {
        error:
          "Set CANVAS_BASE_URL and CANVAS_ACCESS_TOKEN in frontend/.env.local, then restart.",
      },
      { status: 503 },
    );
  if (!base.startsWith("https://"))
    return Response.json(
      { error: "CANVAS_BASE_URL must start with https://" },
      { status: 400 },
    );
  const headers = { Authorization: "Bearer " + token };
  try {
    const coursesRes = await fetch(
      base +
        "/api/v1/courses?enrollment_state=active&include[]=syllabus_body&include[]=teachers&per_page=100",
      { headers, cache: "no-store" },
    );
    const courses = await coursesRes.json();
    if (!coursesRes.ok || !Array.isArray(courses))
      throw new Error(
        courses?.errors?.[0]?.message ||
          "Canvas could not return active courses.",
      );
    const result = await Promise.all(
      courses.map(async (course: CanvasCourse) => {
        const assignmentsRes = await fetch(
          base +
            "/api/v1/courses/" +
            course.id +
            "/assignments?bucket=upcoming&order_by=due_at&per_page=100",
          { headers, cache: "no-store" },
        );
        const assignments: CanvasAssignment[] = assignmentsRes.ok
          ? await assignmentsRes.json()
          : [];
        const teacher = course.teachers?.[0];
        return {
          id: String(course.id),
          course: course.name || course.course_code || "Untitled course",
          professor: teacher?.display_name || "",
          professorEmail: teacher?.email || "",
          syllabus: strip(course.syllabus_body || ""),
          assignments: assignments
            .filter((a) => a.due_at)
            .map((a) => ({
              name: a.name || "Untitled assignment",
              dueAt: a.due_at,
              points: a.points_possible,
              description: strip(a.description || ""),
            })),
        };
      }),
    );
    return Response.json({ courses: result });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Canvas sync failed." },
      { status: 502 },
    );
  }
}
