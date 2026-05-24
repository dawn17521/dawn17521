# Studio — 在线时段预约网站

一个全栈预约平台:用户注册/登录后,在日历中选择日期,在 **8:00–24:00** 的时间轴上
**按住鼠标拖拽**选出连续时段,确认价格后在线支付,支付成功的时段会以高对比色标记为已预约。

UI 采用 Apple 风格的极简设计(大标题、半透明导航、柔和阴影、流畅动画)。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS |
| 后端 | Next.js API Routes (Node.js runtime) |
| 数据库 | SQLite + Prisma ORM(可平滑切换到 PostgreSQL/MySQL) |
| 鉴权 | 自定义 JWT(`jose`)+ httpOnly Cookie + `bcryptjs` 密码哈希 |
| 支付 | 抽象支付层,支持沙盒模拟;可接入微信/支付宝/PayPal/Stripe(卡) |

## 功能

- **账号系统**:邮箱或手机号注册、登录、退出。密码加盐哈希存储。
- **路由保护**:`/booking` 通过中间件校验登录态,未登录自动跳转登录页。
- **日历预约**:选择日期 → 拖拽选时段 → 实时显示时长与价格。
- **冲突校验**:下单和支付两个环节都会在服务端检查时段是否被占用,避免重复预约。
- **多种支付方式**:微信、支付宝、PayPal、Visa、Mastercard、信用/借记卡。
- **状态可视化**:空闲 / 选择中 / 已被预约 / 我的预约,颜色清晰区分。
- **响应式**:适配桌面与移动端,拖拽同时支持鼠标与触屏。

## 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
#   按需修改 .env(至少设置一个足够随机的 JWT_SECRET)

# 3. 初始化数据库
npx prisma migrate dev --name init   # 或 npm run db:push

# 4. 启动开发服务器
npm run dev
# 打开 http://localhost:3000
```

## 生产构建

```bash
npm run build
npm run start
```

## 关于支付(请阅读)

真实扣款需要在各支付平台注册**商户账号**并获取 API 密钥:

- 银行卡(Visa/Mastercard/信用卡/借记卡):推荐用 **Stripe**(`STRIPE_SECRET_KEY`)。
- **PayPal**:`PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`。
- **微信支付**:`WECHAT_PAY_MCH_ID` / `WECHAT_PAY_API_KEY`。
- **支付宝**:`ALIPAY_APP_ID` / `ALIPAY_PRIVATE_KEY`。

在拿到密钥之前,系统运行在 **沙盒模式**:`src/lib/payments.ts` 中的 `processPayment`
会校验金额并返回一笔模拟成功的交易,从而让「选时段 → 确认 → 支付 → 标记已约」的
完整流程可以跑通。当你填入真实密钥后,在 `processPayment` 对应分支接入官方 SDK 即可正式收款。

## 目录结构

```
prisma/schema.prisma          数据模型:User、Booking
src/lib/db.ts                 Prisma 客户端单例
src/lib/auth.ts               JWT 签发/校验、密码哈希、会话 Cookie
src/lib/pricing.ts            营业时间、单价、时段与价格计算
src/lib/payments.ts           支付抽象层(沙盒 + 可接入真实渠道)
src/middleware.ts             /booking 登录态保护
src/app/api/auth/*            注册、登录、退出、当前用户
src/app/api/bookings/route.ts 查询某日时段 / 创建预约(含冲突校验)
src/app/api/payments/checkout 支付并将预约置为已支付
src/app/page.tsx              落地页
src/app/login, /register      登录与注册页
src/app/booking/*             预约主页面 + 拖拽日历组件
src/components/Nav.tsx        顶部导航
```

## 部署与 DNS

可部署到 Vercel(零配置支持 Next.js)、或任意支持 Node 的服务器/容器。
DNS 暂未设置不影响开发与构建;上线时把域名解析到部署平台并在平台绑定域名即可。
若部署到 Vercel,生产环境建议改用托管数据库(如 PostgreSQL),只需修改
`prisma/schema.prisma` 的 `datasource` 与 `DATABASE_URL`。
