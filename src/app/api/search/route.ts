import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchResult = {
  detail: string;
  href: string;
  id: string;
  kind: "task" | "transaction" | "category";
  label: string;
};

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, no-store",
    },
    status,
  });
}

function uniqueResults(results: SearchResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${result.kind}:${result.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return response({ error: "Sign in to search Orbit." }, 401);
  }

  const rawQuery = request.nextUrl.searchParams.get("q")?.trim().slice(0, 80) ?? "";
  const query = rawQuery.replace(/[%_,\\]/g, " ").replace(/\s+/g, " ").trim();
  if (query.length < 2) return response({ results: [] });

  const pattern = `%${query}%`;
  const [taskTitles, taskCategories, transactionTitles, transactionCategories] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id,title,category,due_date")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .ilike("title", pattern)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("tasks")
        .select("category")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .ilike("category", pattern)
        .limit(8),
      supabase
        .from("finance_transactions")
        .select("id,title,category,date")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .ilike("title", pattern)
        .order("date", { ascending: false })
        .limit(5),
      supabase
        .from("finance_transactions")
        .select("category")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .ilike("category", pattern)
        .limit(8),
    ]);

  const queryError = [
    taskTitles.error,
    taskCategories.error,
    transactionTitles.error,
    transactionCategories.error,
  ].find(Boolean);
  if (queryError) {
    return response({ error: "Search is temporarily unavailable." }, 500);
  }

  const results: SearchResult[] = [
    ...(taskTitles.data ?? []).map((task) => ({
      detail: [task.category, task.due_date ? `Due ${task.due_date}` : ""]
        .filter(Boolean)
        .join(" · "),
      href: `/tasks#task-${task.id}`,
      id: task.id,
      kind: "task" as const,
      label: task.title,
    })),
    ...(transactionTitles.data ?? []).map((transaction) => ({
      detail: `${transaction.category} · ${transaction.date}`,
      href: `/finance#transaction-${transaction.id}`,
      id: transaction.id,
      kind: "transaction" as const,
      label: transaction.title,
    })),
  ];

  const categories = new Map<string, "task" | "transaction">();
  for (const item of taskCategories.data ?? []) {
    if (item.category) categories.set(item.category, "task");
  }
  for (const item of transactionCategories.data ?? []) {
    if (item.category && !categories.has(item.category)) {
      categories.set(item.category, "transaction");
    }
  }
  for (const [category, source] of categories) {
    results.push({
      detail: source === "task" ? "Task category" : "Finance category",
      href: source === "task" ? "/tasks" : "/finance",
      id: `${source}:${category.toLocaleLowerCase()}`,
      kind: "category",
      label: category,
    });
  }

  return response({ results: uniqueResults(results).slice(0, 10) });
}
