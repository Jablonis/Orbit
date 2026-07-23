import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const userTables = [
  "tasks",
  "task_completions",
  "fitness_plan_days",
  "fitness_sessions",
  "finance_transactions",
  "finance_statement_imports",
  "weekly_reflections",
] as const;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const [profileResult, ...tableResults] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ...userTables.map((table) =>
      supabase.from(table).select("*").eq("user_id", user.id),
    ),
  ]);
  const failed = [
    profileResult.error,
    ...tableResults.map((result) => result.error),
  ].find(Boolean);

  if (failed) {
    return Response.json(
      { error: "Orbit account data could not be exported." },
      { status: 500 },
    );
  }

  const records = Object.fromEntries(
    userTables.map((table, index) => [table, tableResults[index].data ?? []]),
  );
  const body = JSON.stringify(
    {
      account: {
        createdAt: user.created_at,
        email: user.email ?? null,
        id: user.id,
      },
      exportedAt: new Date().toISOString(),
      profile: profileResult.data,
      records,
      version: 1,
    },
    null,
    2,
  );

  return new Response(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="orbit-account-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
