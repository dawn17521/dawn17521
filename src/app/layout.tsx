import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Studio — 在线预约",
  description: "丝滑流畅的时段预约平台。选择日期,拖拽你想要的时间段,在线完成支付。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbfbfd",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  return (
    <html lang="zh-CN">
      <body className="min-h-screen font-sans antialiased">
        <Nav userName={session?.name ?? null} />
        <main>{children}</main>
        <footer className="border-t border-hairline py-10 text-center text-sm text-muted">
          <p>© {new Date().getFullYear()} Studio. 在线时段预约平台。</p>
        </footer>
      </body>
    </html>
  );
}
