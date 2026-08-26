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

当前没有引入 Vue / React，也没有数据库和后台服务。

## 运行

要求 Node.js 20+。

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
movie-design-web/
├─ src/
│  ├─ components/        # UI 组件
│  ├─ content/           # 数据访问边界，未来在这里接 CMS
│  ├─ data/              # Demo 阶段 Mock 数据
│  ├─ layouts/
│  ├─ pages/
│  ├─ styles/
│  └─ types/             # 内容数据模型
├─ public/
│  ├─ images/
│  └─ videos/
├─ docs/
│  ├─ ARCHITECTURE.md
│  ├─ CONTENT_MODEL.md
│  └─ reference.jpg
├─ astro.config.mjs
├─ package.json
└─ tsconfig.json
```

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


## 设计决策记录

- `docs/PENDING_DESIGN_DECISIONS.md`：待确认的结构与视觉方案；未确认前不直接实施。


## 当前 Demo 交互基线

- Hero 的 `视频 / 短片、专家、科普、10H` 是一级栏目，可直接切换。
- Hero 下方 `01–04` 是当前栏目的介绍，不作为按钮或跳转入口。
- 切换栏目会同步切换下方 01–04 介绍和作品展示内容。
- 作品区 `< >` 控件只浏览当前栏目的作品。
- 移动端作品区仍支持原生手势横滑和 `scroll-snap`。
- 作品详情页暂未实现，方案记录在 `docs/PENDING_DESIGN_DECISIONS.md`。
