import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin-auth";
import { getCatalogToys } from "@/lib/catalog-store";
import { addDraftToys, getDraftToys } from "@/lib/draft-store";
import {
  isProposalParseError,
  parseProposalInput,
  type ProposalInput,
} from "@/lib/proposal";

export const dynamic = "force-dynamic";

function asInputList(body: unknown): ProposalInput[] {
  if (!body || typeof body !== "object") return [];
  const record = body as {
    proposals?: unknown;
    cards?: unknown;
    toys?: unknown;
  };
  if (Array.isArray(body)) return body as ProposalInput[];
  if (Array.isArray(record.proposals)) return record.proposals as ProposalInput[];
  if (Array.isArray(record.cards)) return record.cards as ProposalInput[];
  if (Array.isArray(record.toys)) return record.toys as ProposalInput[];
  return [body as ProposalInput];
}

export async function GET(req: NextRequest) {
  if (!requireAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const drafts = await getDraftToys();
  return NextResponse.json({
    proposals: drafts,
    drafts,
    count: drafts.length,
  });
}

export async function POST(req: NextRequest) {
  if (!requireAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const inputs = asInputList(body);
  if (inputs.length === 0) {
    return NextResponse.json({ error: "No proposal payload" }, { status: 400 });
  }

  const [live, drafts] = await Promise.all([getCatalogToys(), getDraftToys()]);
  const usedIds = new Set<string>([...live.map((t) => t.id), ...drafts.map((t) => t.id)]);

  const created = [];
  const errors: Array<{ name?: string; error: string }> = [];

  for (const input of inputs) {
    const parsed = parseProposalInput(input, usedIds);
    if (isProposalParseError(parsed)) {
      errors.push({ name: input.name, error: parsed.error });
      continue;
    }
    usedIds.add(parsed.id);
    created.push(parsed);
  }

  const added = created.length > 0 ? await addDraftToys(created) : [];

  return NextResponse.json(
    {
      proposals: added,
      drafts: added,
      count: added.length,
      errors,
    },
    { status: added.length > 0 ? 201 : 400 },
  );
}
