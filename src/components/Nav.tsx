"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function Nav({ userName }: { userName: string | null }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-hairline/70 bg-canvas/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="text-[17px] font-semibold tracking-tight">
          Studio
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/booking"
            className="rounded-full px-4 py-2 text-ink/80 transition hover:bg-black/5 hover:text-ink"
          >
            预约
          </Link>
          {userName ? (
            <>
              <span className="hidden px-2 text-muted sm:inline">
                你好,{userName}
              </span>
              <button
                onClick={logout}
                className="rounded-full px-4 py-2 text-ink/80 transition hover:bg-black/5 hover:text-ink"
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-ink/80 transition hover:bg-black/5 hover:text-ink"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-primary px-4 py-2 font-medium text-white transition hover:bg-primary-dark"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
