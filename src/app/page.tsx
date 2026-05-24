import Link from "next/link";
import {
  PRICE_PER_HOUR,
  formatPrice,
  OPEN_HOUR,
  CLOSE_HOUR,
  formatHour,
} from "@/lib/pricing";

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-20 text-center sm:pt-28">
        <p className="animate-fade-up text-sm font-medium uppercase tracking-[0.2em] text-primary">
          在线时段预约
        </p>
        <h1 className="animate-fade-up mt-4 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
          预约,
          <br className="sm:hidden" />
          只需轻轻一拖。
        </h1>
        <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg text-muted sm:text-xl">
          选择日期,在时间轴上拖出你想要的时段,确认后在线支付即可锁定。
          流畅、清晰、即时。
        </p>
        <div className="animate-fade-up mt-10 flex items-center justify-center gap-3">
          <Link href="/booking" className="btn-primary">
            立即预约
          </Link>
          <Link href="/register" className="btn-ghost">
            创建账号
          </Link>
        </div>
        <p className="animate-fade-up mt-6 text-sm text-muted">
          营业时间 {formatHour(OPEN_HOUR)} – {formatHour(CLOSE_HOUR)} ·{" "}
          {formatPrice(PRICE_PER_HOUR)} / 小时
        </p>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              title: "拖拽选时段",
              body: "在 8:00 到 24:00 的时间轴上按住拖拽,实时显示时长与价格。",
            },
            {
              title: "账号与登录",
              body: "支持邮箱或手机号注册,登录后即可管理你的预约。",
            },
            {
              title: "多种支付方式",
              body: "微信、支付宝、PayPal、Visa、Mastercard、信用/借记卡。",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-3xl bg-white p-8 shadow-soft transition hover:shadow-card"
            >
              <h3 className="text-xl font-semibold">{f.title}</h3>
              <p className="mt-3 text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-hairline bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            三步完成预约
          </h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {[
              ["01", "选择日期", "在日历中挑选你想预约的那一天。"],
              ["02", "拖出时段", "按住起始时间拖动到结束时间,松手确认。"],
              ["03", "支付锁定", "确认价格后完成支付,该时段立即被标记。"],
            ].map(([n, t, b]) => (
              <div key={n}>
                <div className="text-4xl font-semibold text-primary">{n}</div>
                <h3 className="mt-3 text-xl font-semibold">{t}</h3>
                <p className="mt-2 text-muted">{b}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/booking" className="btn-primary">
              开始预约
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
