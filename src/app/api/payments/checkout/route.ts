import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { processPayment, isValidMethod } from "@/lib/payments";

const ACTIVE = ["PENDING", "PAID"];

export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const bookingId = String(body.bookingId ?? "");
  const method = String(body.method ?? "");

  if (!bookingId)
    return NextResponse.json({ error: "缺少订单号" }, { status: 400 });
  if (!isValidMethod(method))
    return NextResponse.json({ error: "不支持的支付方式" }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.userId !== session.sub)
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  if (booking.status === "PAID")
    return NextResponse.json({ error: "该订单已支付" }, { status: 409 });
  if (booking.status === "CANCELLED")
    return NextResponse.json({ error: "该订单已取消" }, { status: 409 });

  // Re-check for conflicts created by other users while this booking was pending.
  const conflict = await prisma.booking.findFirst({
    where: {
      id: { not: booking.id },
      date: booking.date,
      status: { in: ACTIVE },
      startHour: { lt: booking.endHour },
      endHour: { gt: booking.startHour },
    },
    select: { id: true },
  });
  if (conflict) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json(
      { error: "很抱歉,该时间段刚被他人预约,订单已取消" },
      { status: 409 },
    );
  }

  const result = await processPayment({
    bookingId: booking.id,
    amount: booking.amount,
    currency: booking.currency,
    method,
  });

  if (!result.success)
    return NextResponse.json(
      { error: result.message ?? "支付失败" },
      { status: 402 },
    );

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "PAID",
      paymentMethod: method,
      paymentRef: result.reference,
    },
  });

  return NextResponse.json({
    ok: true,
    bookingId: updated.id,
    status: updated.status,
    reference: result.reference,
    mode: result.mode,
  });
}
