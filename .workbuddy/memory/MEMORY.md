# Project Memory — movie-design-web

- 类型：Astro 单页（深色摄影工作室 Demo），代码 + Ardot 设计稿同步迭代。
- 字体：全站 Sarasa Gothic SC（含中文）。
- 摄影师人像（src/data/home.ts → photographers）已切到本地 `/photographers/zhangfeng.jpg`、`wangshiyu.jpg`；其它栏目封面仍走 Unsplash 远程图。
- 作品展示采用 Cover Flow（焦点居中放大 + 侧卡模糊压暗 + 贴边箭头 + 拖拽/滑动/横滑滚轮手势），分支 `feature/works-coverflow`。
- 环境：托管 Node 22（`~/.workbuddy/binaries/node/versions/22.22.2`）用于构建与 dev；托管 Python 3.13.12 的 venv `~/.workbuddy/binaries/python/envs/default` 已装 Pillow（无 ImageMagick，环境内缺图处理工具时走此 venv）。
- 构建末尾 `genie-safe-delete` 回收 `dist/pages/*.mjs` 失败属沙箱噪音（exit 1），不影响产物；以"真实编译错误 grep 为空 + dist/index.html 时间戳新鲜"为准。