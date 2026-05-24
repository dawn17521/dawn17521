import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { OPEN_HOUR, CLOSE_HOUR, priceFor, CURRENCY } from "@/lib/pricing";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ACTIVE = ["PENDING", "PAID"];

/** GET /api/bookings?date=YYYY-MM-DD -> reserved ranges for that day. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? "";
  if (!DATE_RE.test(date))
    return NextResponse.json({ error: "无效日期" }, { status: 400 });

  const session = await getSession();

  const bookings = await prisma.booking.findMany({
    where: { date, status: { in: ACTIVE } },
    select: {
      id: true,
      startHour: true,
      endHour: true,
      status: true,
      userId: true,
    },
    orderBy: { startHour: "asc" },
  });

  const slots = bookings.map((b) => ({
    startHour: b.startHour,
    endHour: b.endHour,
    status: b.status,
    mine: session ? b.userId === session.sub : false,
  }));

  return NextResponse.json({ date, slots });
}

/** POST /api/bookings -> create a PENDING booking after a conflict check. */
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

  const date = String(body.date ?? "");
  const startHour = Number(body.startHour);
  const endHour = Number(body.endHour);

  if (!DATE_RE.test(date))
    return NextResponse.json({ error: "无效日期" }, { status: 400 });
  if (
    !Number.isInteger(startHour) ||
    !Number.isInteger(endHour) ||
    startHour < OPEN_HOUR ||
    endHour > CLOSE_HOUR ||
    startHour >= endHour
  )
    return NextResponse.json({ error: "无效的时间段" }, { status: 400 });

  // Overlap check against active bookings on the same day.
  const conflict = await prisma.booking.findFirst({
    where: {
      date,
      status: { in: ACTIVE },
      startHour: { lt: endHour },
      endHour: { gt: startHour },
    },
    select: { id: true },
  });
  if (conflict)
    return NextResponse.json(
      { error: "该时间段已被预约,请重新选择" },
      { status: 409 },
    );

  const amount = priceFor(startHour, endHour);

  const booking = await prisma.booking.create({
    data: {
      userId: session.sub,
      date,
      startHour,
      endHour,
      amount,
      currency: CURRENCY,
      status: "PENDING",
    },
  });

  return NextResponse.json({
    id: booking.id,
    date: booking.date,
    startHour: booking.startHour,
    endHour: booking.endHour,
    amount: booking.amount,
    currency: booking.currency,
  });
}
