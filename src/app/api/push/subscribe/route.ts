import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SubscribeBody = {
  endpoint?: unknown;
  keys?: { auth?: unknown; p256dh?: unknown };
};

function readSubscription(body: SubscribeBody) {
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";

  if (!endpoint || !p256dh || !auth) return null;
  if (endpoint.length > 1000) return null;
  if (!endpoint.startsWith("https://")) return null;

  return { auth, endpoint, p256dh };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const subscription = readSubscription(body);
  if (!subscription) {
    return Response.json(
      { error: "This subscription is missing its endpoint or keys." },
      { status: 400 },
    );
  }

  const { error } = await supabase.rpc("save_push_subscription", {
    p_auth: subscription.auth,
    p_endpoint: subscription.endpoint,
    p_p256dh: subscription.p256dh,
    p_user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? "",
  });

  if (error) {
    return Response.json(
      { error: "The reminder could not be turned on. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) {
    return Response.json({ error: "Missing endpoint." }, { status: 400 });
  }

  const { error } = await supabase.rpc("delete_push_subscription", {
    p_endpoint: endpoint,
  });

  if (error) {
    return Response.json(
      { error: "The reminder could not be turned off. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
