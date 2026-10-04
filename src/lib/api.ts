import { NextResponse } from "next/server";
import { AuthError } from "./auth";
import { CreditError } from "./credits";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(error: unknown) {
  if (error instanceof AuthError || error instanceof CreditError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Error && "status" in error) {
    const status = Number((error as Error & { status: number }).status) || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
