# 架构与阶段规划

## 决策原则

这个项目优先级按下面顺序执行：

1. **Demo 迭代速度**：设计阶段修改必须快，避免为了未来后台拖慢当前验证。
2. **长页性能**：图片、视频和交互资源必须按优先级加载，而不是整页一次性重资源下载。
3. **未来运营简单**：未来后台面向非技术用户，只暴露“内容、排序、上下架、上传、发布”。
4. **可替换的数据来源**：UI 不直接依赖本地文件或某个 CMS。
5. **避免过度工程化**：当前没有必要引入数据库、登录、权限、Vue/React 状态管理。

## Phase 1 — Demo 基础架构（当前）

目标：保留快速设计能力，同时为性能与 CMS 留接口。

- Astro 静态生成。
- 页面拆分为 Astro 组件。
- 所有展示数据集中在 `src/data/home.ts`。
- 页面通过 `src/content/index.ts` 获取数据，不直接 import Mock 数据。
- 首屏 Hero 图片高优先级加载。
- 非首屏图片全部 `loading="lazy" + decoding="async"`。
- 下方 Section 使用 `content-visibility:auto` 减少长页初始渲染成本。
- 视频不写入 `<video src>`，点击播放后才动态创建播放器并赋值 URL。
- 当前不引入 Vue / React；只有复杂交互出现后再使用 Astro Island。

## Phase 2 — 视觉方案稳定后的媒体治理

目标：解决真正上线时最容易出现的性能问题。

- 把 Unsplash Demo 图片替换为正式素材。
- 建立图片尺寸规范：缩略图 / 卡片 / Hero。
- 优先 AVIF / WebP，多尺寸响应式图片。
- 视频使用 Poster；默认不加载视频文件。
- 大视频进入对象存储/CDN，根据流量决定 MP4 Range 或 HLS。
- Lighthouse / Core Web Vitals 作为上线前验收项。

## Phase 3 — CMS 接入

默认推荐先评估 Directus；也可以换 Payload 或公司已有后台。

组件不会直接调用 CMS。只修改：

```text
src/content/index.ts
```

数据流从：

```text
src/data/home.ts -> content provider -> Astro components
```

替换成：

```text
CMS API -> content provider -> Astro components
```

页面组件保持不动。

## Phase 4 — 傻瓜式运营后台

后台页面按固定业务结构提供，不开放自由搭页面能力。

运营人员只需要完成：

- 上传图片 / 视频封面
- 输入标题与描述
- 选择分类
- 拖动排序
- 开启 / 关闭展示
- 保存草稿 / 发布

图片压缩、格式转换、响应式尺寸、CDN URL、视频编码等技术字段不暴露给运营人员。

## 为什么现在不做后台

当前仍在验证设计。如果此时实现数据库、鉴权、上传、CMS Schema，会让每一次视觉调整都背负额外成本。

Phase 1 的数据边界已经确保未来接后台不需要推翻 UI，因此现在继续集中精力验证页面设计最划算。
