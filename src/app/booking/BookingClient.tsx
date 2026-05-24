"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Method = { id: string; label: string };

type Slot = {
  startHour: number;
  endHour: number;
  status: string;
  mine: boolean;
};

type Pending = {
  id: string;
  date: string;
  startHour: number;
  endHour: number;
  amount: number;
  currency: string;
};

function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function fmtHour(h: number): string {
  return `${String(h % 24).padStart(2, "0")}:00`;
}

export function BookingClient({
  openHour,
  closeHour,
  pricePerHour,
  symbol,
  methods,
}: {
  openHour: number;
  closeHour: number;
  pricePerHour: number;
  symbol: string;
  methods: Method[];
}) {
  const router = useRouter();
  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = openHour; h < closeHour; h++) arr.push(h);
    return arr;
  }, [openHour, closeHour]);

  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  const [modal, setModal] = useState<null | "confirm" | "pay" | "success">(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [payMethod, setPayMethod] = useState<string>(methods[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  // Map of hour -> slot status for the selected day.
  const statusByHour = useMemo(() => {
    const map = new Map<number, "mine" | "booked">();
    for (const s of slots) {
      for (let h = s.startHour; h < s.endHour; h++) {
        map.set(h, s.mine ? "mine" : "booked");
      }
    }
    return map;
  }, [slots]);

  const loadSlots = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings?date=${d}`, { cache: "no-store" });
      const data = await res.json();
      setSlots(res.ok ? data.slots ?? [] : []);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlots(date);
  }, [date, loadSlots]);

  // Current selection range derived from drag anchors.
  const range = useMemo(() => {
    if (dragStart === null || dragEnd === null) return null;
    const lo = Math.min(dragStart, dragEnd);
    const hi = Math.max(dragStart, dragEnd);
    return { start: lo, end: hi + 1 }; // end is exclusive
  }, [dragStart, dragEnd]);

  const rangeValid = useMemo(() => {
    if (!range) return false;
    for (let h = range.start; h < range.end; h++) {
      if (statusByHour.has(h)) return false;
    }
    return true;
  }, [range, statusByHour]);

  const hourFromPoint = useCallback((x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const cell = el?.closest<HTMLElement>("[data-hour]");
    if (!cell) return null;
    const h = Number(cell.dataset.hour);
    return Number.isNaN(h) ? null : h;
  }, []);

  const startDrag = useCallback(
    (hour: number) => {
      if (statusByHour.has(hour) || modal) return;
      setDragging(true);
      setDragStart(hour);
      setDragEnd(hour);
    },
    [statusByHour, modal],
  );

  // Global pointer handlers so dragging works even outside the grid.
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      const h = hourFromPoint(e.clientX, e.clientY);
      if (h !== null) setDragEnd(h);
    };

    const onUp = () => {
      setDragging(false);
      setDragStart((s) => {
        setDragEnd((en) => {
          if (s !== null && en !== null) {
            const lo = Math.min(s, en);
            const hi = Math.max(s, en) + 1;
            let valid = true;
            for (let h = lo; h < hi; h++) if (statusByHour.has(h)) valid = false;
            if (valid) {
              setError("");
              setModal("confirm");
            }
          }
          return en;
        });
        return s;
      });
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, hourFromPoint, statusByHour]);

  function clearSelection() {
    setDragStart(null);
    setDragEnd(null);
  }

  function inRange(h: number): boolean {
    return !!range && h >= range.start && h < range.end;
  }

  const selHours = range ? range.end - range.start : 0;
  const selTotal = selHours * pricePerHour;

  async function confirmBooking() {
    if (!range) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          startHour: range.start,
          endHour: range.end,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/login?next=/booking");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "创建预约失败");
        await loadSlots(date);
        setModal(null);
        clearSelection();
        return;
      }
      setPending(data);
      setModal("pay");
    } catch {
      setError("网络错误,请重试");
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!pending) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: pending.id, method: payMethod }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "支付失败");
        if (res.status === 409) {
          await loadSlots(date);
          setModal(null);
          clearSelection();
        }
        return;
      }
      await loadSlots(date);
      setModal("success");
      clearSelection();
    } catch {
      setError("网络错误,请重试");
    } finally {
      setBusy(false);
    }
  }

  function closeModals() {
    setModal(null);
    setPending(null);
    clearSelection();
    setError("");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      {/* Time grid */}
      <section>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium">日期</label>
          <input
            type="date"
            className="field max-w-[200px] py-2"
            value={date}
            min={todayStr()}
            onChange={(e) => {
              clearSelection();
              setDate(e.target.value);
            }}
          />
          {error && !modal && (
            <span className="text-sm text-red-600">{error}</span>
          )}
        </div>

        <div
          ref={gridRef}
          className="no-select overflow-hidden rounded-2xl border border-hairline bg-white shadow-soft"
          style={{ touchAction: "none" }}
        >
          {loading ? (
            <div className="p-10 text-center text-muted">加载中…</div>
          ) : (
            hours.map((h) => {
              const st = statusByHour.get(h);
              const selected = inRange(h);
              let cls = "bg-white hover:bg-black/[0.03]";
              let label = "空闲";
              if (st === "booked") {
                cls = "bg-ink text-white cursor-not-allowed";
                label = "已预约";
              } else if (st === "mine") {
                cls = "bg-emerald-600 text-white cursor-not-allowed";
                label = "我的预约";
              }
              if (selected) {
                cls = rangeValid
                  ? "bg-primary text-white"
                  : "bg-red-500 text-white";
                label = "选择中";
              }
              return (
                <div
                  key={h}
                  data-hour={h}
                  onPointerDown={(e) => {
                    if (st) return;
                    e.preventDefault();
                    startDrag(h);
                  }}
                  className={`flex h-12 cursor-pointer items-center justify-between border-b border-hairline/60 px-4 text-sm transition-colors last:border-b-0 ${cls}`}
                >
                  <span className="font-medium tabular-nums">
                    {fmtHour(h)} – {fmtHour(h + 1)}
                  </span>
                  <span className="text-xs opacity-80">{label}</span>
                </div>
              );
            })
          )}
        </div>

        <p className="mt-3 text-sm text-muted">
          提示:在空闲时段上按住鼠标并向下拖动,选择连续的时间段。
        </p>
      </section>

      {/* Sidebar: legend + summary */}
      <aside className="space-y-5">
        <div className="rounded-2xl border border-hairline bg-white p-5 shadow-soft">
          <h3 className="text-sm font-semibold">图例</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="h-4 w-4 rounded border border-hairline bg-white" />
              空闲
            </li>
            <li className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-primary" />
              选择中
            </li>
            <li className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-ink" />
              已被预约
            </li>
            <li className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-emerald-600" />
              我的预约
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-hairline bg-white p-5 shadow-soft">
          <h3 className="text-sm font-semibold">当前选择</h3>
          {range ? (
            <div className="mt-3 space-y-1 text-sm">
              <p>
                {date} {fmtHour(range.start)} – {fmtHour(range.end)}
              </p>
              <p className="text-muted">共 {selHours} 小时</p>
              <p className="text-lg font-semibold">
                {symbol}
                {selTotal}
              </p>
              {!rangeValid && (
                <p className="text-red-600">所选范围包含已被预约的时段</p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">尚未选择时间段。</p>
          )}
          <p className="mt-4 text-xs text-muted">单价 {symbol}{pricePerHour} / 小时</p>
        </div>
      </aside>

      {/* Confirm modal */}
      {modal === "confirm" && range && (
        <Modal onClose={busy ? undefined : closeModals}>
          <h2 className="text-xl font-semibold">确认预约</h2>
          <p className="mt-3 text-muted">请确认你的预约信息:</p>
          <div className="mt-4 rounded-xl bg-canvas p-4 text-sm">
            <Row label="日期" value={date} />
            <Row
              label="时间段"
              value={`${fmtHour(range.start)} – ${fmtHour(range.end)}`}
            />
            <Row label="时长" value={`${selHours} 小时`} />
            <Row
              label="合计"
              value={`${symbol}${selTotal}`}
              strong
            />
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex gap-3">
            <button
              className="btn-ghost flex-1"
              onClick={closeModals}
              disabled={busy}
            >
              取消
            </button>
            <button
              className="btn-primary flex-1"
              onClick={confirmBooking}
              disabled={busy}
            >
              {busy ? "处理中…" : "确认并支付"}
            </button>
          </div>
        </Modal>
      )}

      {/* Payment modal */}
      {modal === "pay" && pending && (
        <Modal onClose={busy ? undefined : closeModals}>
          <h2 className="text-xl font-semibold">选择支付方式</h2>
          <p className="mt-2 text-muted">
            {pending.date} {fmtHour(pending.startHour)} –{" "}
            {fmtHour(pending.endHour)} · 应付{" "}
            <span className="font-semibold text-ink">
              {symbol}
              {pending.amount}
            </span>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {methods.map((m) => (
              <button
                key={m.id}
                onClick={() => setPayMethod(m.id)}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                  payMethod === m.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-hairline hover:border-ink/30"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            当前为沙盒模式,不会真实扣款。接入商户密钥后即可正式收款。
          </p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex gap-3">
            <button
              className="btn-ghost flex-1"
              onClick={closeModals}
              disabled={busy}
            >
              取消
            </button>
            <button className="btn-primary flex-1" onClick={pay} disabled={busy}>
              {busy ? "支付中…" : `支付 ${symbol}${pending.amount}`}
            </button>
          </div>
        </Modal>
      )}

      {/* Success modal */}
      {modal === "success" && (
        <Modal onClose={closeModals}>
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
              ✓
            </div>
            <h2 className="mt-4 text-xl font-semibold">预约成功</h2>
            <p className="mt-2 text-muted">
              该时段已为你锁定,并在时间轴上标记为「我的预约」。
            </p>
            <button className="btn-primary mt-6 w-full" onClick={closeModals}>
              完成
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted">{label}</span>
      <span className={strong ? "text-base font-semibold" : ""}>{value}</span>
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-scale-in w-full max-w-md rounded-3xl bg-white p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
