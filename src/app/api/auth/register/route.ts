import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signSession, setSessionCookie } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{6,15}$/;

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const identifier = String(body.identifier ?? "").trim();
  const password = String(body.password ?? "");

  if (!name) return NextResponse.json({ error: "请填写姓名" }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });

  const isEmail = EMAIL_RE.test(identifier);
  const isPhone = PHONE_RE.test(identifier);
  if (!isEmail && !isPhone)
    return NextResponse.json(
      { error: "请输入有效的邮箱或手机号" },
      { status: 400 },
    );

  const existing = await prisma.user.findFirst({
    where: isEmail ? { email: identifier } : { phone: identifier },
  });
  if (existing)
    return NextResponse.json(
      { error: "该邮箱/手机号已被注册" },
      { status: 409 },
    );

  const user = await prisma.user.create({
    data: {
      name,
      password: await hashPassword(password),
      email: isEmail ? identifier : null,
      phone: isPhone ? identifier : null,
    },
  });

  const token = await signSession({ sub: user.id, name: user.name });
  await setSessionCookie(token);

  return NextResponse.json({ id: user.id, name: user.name });
}
