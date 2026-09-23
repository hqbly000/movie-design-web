# Movie Design Web

摄影 / 影视视觉方向的长页展示 Demo。

当前阶段重点不是做后台，而是：**快速验证视觉 + 建好性能底座 + 让未来 CMS 可以无痛接入。**

## 技术方案

- Astro
- TypeScript 数据模型
- Astro Components
- 原生浏览器交互
- 本地 Mock 数据
- 静态输出

当前没有引入 Vue / React。

- 官网为纯静态 Astro；内容管理由独立后台提供（见下文「独立内容后台」）。

## 运行

要求 Node.js 20+。工程根即 Astro 根目录：

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
npm run preview
```

## 目录结构

```text
movie-design-web/        # 工程根 = Astro 根目录
├─ src/
│  ├─ components/        # UI 组件
│  ├─ content/           # 数据访问边界，未来在这里接 CMS
│  ├─ data/              # Demo 阶段 Mock 数据
│  ├─ layouts/
│  ├─ lib/               # 运行时客户端（后台公开接口）
│  ├─ pages/
│  ├─ styles/
│  └─ types/             # 内容数据模型
├─ public/
├─ docs/
├─ astro.config.mjs
├─ package.json
├─ server/               # 独立 Node 内容后台（见下文）
├─ nginx.example.conf
└─ README.md
```

> 2026-09-23：原先套在 `frontend/` 子目录下，已整体上移一层与工程根合并（`src/`、`public/` 现直接位于 `movie-design-web/` 下）。

## 修改 Demo 内容

现阶段绝大部分内容集中在：

```text
src/data/home.ts
```

例如更换摄影师、作品、新闻或 Hero 内容，不需要改组件结构。

## 长页性能策略

- Hero 图片：立即加载，`fetchpriority="high"`。
- 作品 / 摄影师 / 新闻图片：浏览器原生懒加载。
- 下方页面区块：`content-visibility:auto` 延迟渲染。
- 视频：点击以后才创建 `<video>` 并绑定真实视频 URL。
- JS：只保留当前必要的导航与视频弹层交互。

## 下一阶段

先继续做视觉 Demo。设计基本稳定后，再进入正式媒体规范和 CMS PoC。

详细路线见 `docs/ARCHITECTURE.md`。

## 独立内容后台（server/）

官网保持纯静态（`output: 'static'`），内容管理由一个**独立 Node 后端**提供，单独入口、单独端口部署，前端通过 nginx 反代接入。

### 架构

```text
nginx (80/443)
├─ /                    Astro 静态官网 dist/
└─ /api /p /uploads /admin  →  Node 后台 127.0.0.1:3001
```

- 后端：Express 5 + node:sqlite（Node 22.5+ 内置），纯 JS 无构建
- 鉴权：scrypt 密码哈希 + HMAC 签名 Session Cookie（HttpOnly，7 天）
- 后台 UI：`server/admin-ui/` 原生 HTML/CSS/JS，移动优先响应式

### 功能

| 页面 | 功能 |
| --- | --- |
| `/admin/videos.html` | B 站视频管理：粘贴任意 B 站链接自动解析 BV 号，生成 iframe 播放地址 |
| `/admin/images.html` | 首页图片管理：hero 主图 / 展示海报，支持本地上传（10MB 内） |
| `/admin/links.html` | **限时审片链接**：勾选若干视频/图片，生成 1 小时~3 天有效的客户预览页链接，支持复制 / 系统分享 / 续期 / 禁用 / 访问计数 |

- 客户打开限时链接 `/p/:token` 看到深色审片页（标题、备注、倒计时、视频弹层播放），过期/禁用后显示失效页。
- 后台管理的 B 站视频运行时注入官网「作品展示 → 视频 / 短片」栏目（接管 Mock 卡片，点击弹出 B 站播放弹层）；Hero 主图同理运行时替换。接口不可用时回退内置内容，不影响静态站本身。

### 本地运行

后台（要求 Node.js 22.5+，与前端可并行）：

```bash
cd server
npm install
copy .env.example .env   # 修改 SESSION_SECRET 与 ADMIN_INITIAL_PASSWORD
npm run dev              # http://localhost:3001/admin/
```

前端 dev 已在 `astro.config.mjs` 中配置代理（`/api`、`/p`、`/uploads` → 3001），在工程根 `npm run dev` 打开官网即可联调。

### 部署

1. 工程根 `npm run build`，产物 `dist/` 交给 nginx 托管；
2. 服务器上 `cd server && npm ci --omit=dev && node src/index.js`（或用 pm2/systemd 守护）；
3. nginx 配置参考仓库根目录的 `nginx.example.conf`。



## 设计决策记录

- `docs/PENDING_DESIGN_DECISIONS.md`：待确认的结构与视觉方案；未确认前不直接实施。


## 当前 Demo 交互基线

- Hero 的 `视频 / 短片、专家、科普、10H` 是一级栏目，可直接切换。
- Hero 下方 `01–04` 是当前栏目的介绍，不作为按钮或跳转入口。
- 切换栏目会同步切换下方 01–04 介绍和作品展示内容。
- 作品区 `< >` 控件只浏览当前栏目的作品。
- 移动端作品区仍支持原生手势横滑和 `scroll-snap`。
- 作品详情页暂未实现，方案记录在 `docs/PENDING_DESIGN_DECISIONS.md`。
