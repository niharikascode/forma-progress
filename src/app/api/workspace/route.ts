import { NextRequest, NextResponse } from "next/server";
import { getDatabase, readWorkspace, execute } from "@/lib/database";
import { ZodError } from "zod";
import { currentAccount } from "@/lib/auth";
const unauthorized = () =>
  NextResponse.json({ error: "Please log in again." }, { status: 401 });
export const dynamic = "force-dynamic";
export async function GET() {
  const account = await currentAccount();
  if (!account) return unauthorized();
  return NextResponse.json(
    await readWorkspace(await getDatabase(), account.userId),
  );
}
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (
    origin &&
    new URL(origin).host !== request.headers.get("host") &&
    new URL(origin).host !== request.headers.get("x-forwarded-host")
  )
    return NextResponse.json(
      { error: "Cross-origin writes are not allowed." },
      { status: 403 },
    );
  const account = await currentAccount();
  if (!account) return unauthorized();
  try {
    return NextResponse.json(
      await execute(await getDatabase(), await request.json(), account.userId),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ZodError
            ? error.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("; ")
            : error instanceof Error
              ? error.message
              : "Unable to save changes.",
      },
      { status: 400 },
    );
  }
}
