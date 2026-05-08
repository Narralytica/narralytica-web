import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYLOADS = ["manifest", "hero", "overview", "desk", "desk_brief", "market_structure", "news", "macro", "watchlist", "analysis"] as const;

type PayloadName = (typeof PAYLOADS)[number];

type TerminalPayloadRow = {
  payload_key: string;
  payload: unknown;
};

function envValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return "";
}

async function readPayloadsFromSupabase() {
  const supabaseUrl = envValue("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = envValue("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL/SUPABASE_ANON_KEY environment variables");
  }

  const keys = PAYLOADS.map((name) => `terminal:${name}`).join(",");
  const query = new URLSearchParams({
    payload_key: `in.(${keys})`,
    select: "payload_key,payload",
  });

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/terminal_payloads?${query.toString()}`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase terminal payload request failed with ${response.status}: ${body}`);
  }

  const rows = (await response.json()) as TerminalPayloadRow[];
  const payloadByName = Object.fromEntries(rows.map((row) => [row.payload_key.replace(/^terminal:/, ""), row.payload]));
  const missing = PAYLOADS.filter((name) => !payloadByName[name]);

  if (missing.length > 0) {
    throw new Error(`Missing terminal payload rows in Supabase: ${missing.join(", ")}`);
  }

  return Object.fromEntries(PAYLOADS.map((name) => [name, payloadByName[name]])) as Record<PayloadName, unknown>;
}

export async function GET() {
  try {
    const payloads = await readPayloadsFromSupabase();
    return NextResponse.json(payloads);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read terminal data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
