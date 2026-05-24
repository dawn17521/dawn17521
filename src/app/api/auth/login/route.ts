import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const identifier = String(body.identifier ?? "").trim();
  const password = String(body.password ?? "");

  if (!identifier || !password)
    return NextResponse.json({ error: "请填写账号和密码" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
  });

  if (!user || !(await verifyPassword(password, user.password)))
    return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });

  const token = await signSession({ sub: user.id, name: user.name });
  await setSessionCookie(token);

  return NextResponse.json({ id: user.id, name: user.name });
}
