import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const service = () => {
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(supabaseUrl, serviceRoleKey);
};

const getSessionUser = async (req: NextRequest) => {
  const client = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {
          /* no-op: route handlers are read-only for cookies here */
        },
      },
    }
  );

  const { data, error } = await client.auth.getUser();

  if (error || !data.user) return null;
  return data.user;
};

const ensureMember = async (tenantId: string, userId: string) => {
  const svc = service();
  const { data, error } = await svc
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { role: null, error };
  if (data) return { role: data.role as string, error: null };

  // fallback: if the user is the creator, auto-insert as owner
  const { data: tenant, error: tenantError } = await svc
    .from("tenants")
    .select("created_by")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantError) return { role: null, error: tenantError };

  if (tenant?.created_by === userId) {
    await svc
      .from("tenant_members")
      .upsert({ tenant_id: tenantId, user_id: userId, role: "owner" }, { onConflict: "tenant_id,user_id" });
    return { role: "owner", error: null };
  }

  return { role: null, error: null };
};

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = req.nextUrl.searchParams.get("tenantId");
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const { role, error } = await ensureMember(tenantId, user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!role) {
      return NextResponse.json({ error: "Forbidden (not a workspace member)" }, { status: 403 });
    }

    const svc = service();
    const { data: members, error: memberError } = await svc
      .from("tenant_members")
      .select("user_id, role, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    const enriched = await Promise.all(
      (members ?? []).map(async (m) => {
        const userRes = await svc.auth.admin.getUserById(m.user_id);
        return {
          userId: m.user_id,
          role: m.role,
          email: userRes.data.user?.email ?? null,
        };
      })
    );

    return NextResponse.json({ members: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unexpected error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const email = (body?.email as string | undefined)?.trim().toLowerCase();
    const tenantId = body?.tenantId as string | undefined;

    if (!email || !tenantId) {
      return NextResponse.json({ error: "email and tenantId are required" }, { status: 400 });
    }

    const { role, error: memberError } = await ensureMember(tenantId, user.id);
    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }
    if (!role) {
      return NextResponse.json({ error: "Forbidden (not a workspace member)" }, { status: 403 });
    }

    const svc = service();
    const { data: invite, error: inviteError } =
      await svc.auth.admin.inviteUserByEmail(email);

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    const invitedUserId = invite.user?.id;
    if (invitedUserId) {
      await svc
        .from("tenant_members")
        .upsert(
          { tenant_id: tenantId, user_id: invitedUserId, role: "member" },
          { onConflict: "tenant_id,user_id" }
        );
    }

    return NextResponse.json({ ok: true, invitedUserId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unexpected error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const tenantId = body?.tenantId as string | undefined;
    const targetUserId = body?.userId as string | undefined;

    if (!tenantId || !targetUserId) {
      return NextResponse.json({ error: "tenantId and userId are required" }, { status: 400 });
    }

    const { role, error: memberError } = await ensureMember(tenantId, user.id);
    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }
    if (!role) {
      return NextResponse.json({ error: "Forbidden (not a workspace member)" }, { status: 403 });
    }

    const svc = service();
    const { error } = await svc
      .from("tenant_members")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("user_id", targetUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unexpected error" }, { status: 500 });
  }
}
