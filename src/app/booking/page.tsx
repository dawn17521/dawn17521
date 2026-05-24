import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  OPEN_HOUR,
  CLOSE_HOUR,
  PRICE_PER_HOUR,
  currencySymbol,
} from "@/lib/pricing";
import { PAYMENT_METHODS } from "@/lib/payments";
import { BookingClient } from "./BookingClient";

export default async function BookingPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/booking");

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          预约时段
        </h1>
        <p className="mt-2 text-muted">
          选择日期,在时间轴上按住并拖拽出你想要的时间段。
        </p>
      </header>

      <BookingClient
        openHour={OPEN_HOUR}
        closeHour={CLOSE_HOUR}
        pricePerHour={PRICE_PER_HOUR}
        symbol={currencySymbol()}
        methods={PAYMENT_METHODS}
      />
    </div>
  );
}
