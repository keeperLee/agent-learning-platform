# Agent 学习平台

一个**纯静态、零依赖、可直接部署到 GitHub Pages** 的网页阅读版 AI Agent 学习平台。涵盖 Agent 的基础概念、核心原理、架构设计、实战案例与成本工程，共 26 章，并附一个**零依赖、可运行**的完整示例项目与延伸阅读、术语表、FAQ。

平台带**登录门禁与用户体系**：账号由管理员开通后才能进入，学习进度、笔记与书签按账号隔离。但请注意，纯静态站点的登录是**访问控制而非安全防护**，详见 [账号与登录](#账号与登录)。

---

## 特性

**阅读体验**

- 三栏布局：左侧章节树、中间正文、右侧本节目录（滚动自动高亮）
- 顶部阅读进度条；滚动位置自动保存，下次进入自动续读
- 图文混排：内嵌 SVG 结构示意图（自动跟随深色模式换色）
- 代码块：语法高亮、行号高亮、一键复制、文件名标注
- 深色 / 浅色 / 跟随系统三态主题
- 响应式布局：桌面端三栏，平板双栏，移动端抽屉式导航

**学习功能**

- **学习进度跟踪**：自动标记「在读 / 已完成」，达到 93% 阅读进度自动完成
- **章节导航**：按模块折叠、进度点标记、上一章 / 下一章
- **分级阅读路径**：入门 / 进阶 / 实战 / 全部，四档递进，侧边栏按路径过滤
- **笔记标注**：选中正文即可「标记重点」或「写笔记」，跨刷新自动恢复
- **书签**：支持整章书签与片段书签
- **我的面板**：笔记 / 书签 / 进度三个视图，支持导出与导入学习数据
- **全局搜索**：`Ctrl/⌘ + K` 唤起命令面板，中文分词 + 章节标题加权 + 结果高亮定位
- **更新日志**：顶部栏版本号入口（存在未读版本时显示提示点），点开可见完整版本时间线
- **阅读设置**：正文字号 / 行距 / 版心宽度 / 正文字体四组选项，即时生效并持久化
- **内容时效性**：每章标注信息基准时间；快速变化的章节（模型能力、框架、价格）自动插入时效提醒

**账号与权限**

- **登录门禁**：未登录时页面上不渲染任何学习内容 —— 顶栏、侧边栏、章节树整体隐藏，搜索索引也不会建立
- **用户管理后台**：管理员可注册用户、启停账号、调整角色、重置密码、删除账号
- **账号设置**：改显示名与备注、自助修改密码（需校验原密码）、查看会话有效期
- **命令行管理**：`npm run user -- ...`，适合忘记密码或批量开号
- **数据隔离**：每个账号的进度、笔记、书签、标注存在各自的存储命名空间下，互不串扰
- **凭据安全**：密码只保存加盐迭代哈希（迭代式 SHA-256，每用户独立随机盐），全程不落明文

**配套示例项目**

- [`examples/support-agent/`](examples/support-agent/) —— 一个**零依赖、没有 API Key 也能跑通**的完整客服 Agent
- 把主循环、工具调用、权限校验、人工审批、护栏、幂等、Trace 全部组装成可运行系统
- 含 33 项零成本单元测试（`python -m unittest discover -s tests`）

**内容维护**

- 课程内容全部为 Markdown，新增章节只需登记目录 + 建文件
- 更新日志由 `content/changelog.js` 单一数据源驱动，新增版本只需加一条记录
- 内置三个校验/测试脚本：内容校验、外链检查、浏览器交互回归，全部接入 CI

**交互式演示**（8 个）

| 演示 | 所在章节 | 说明 |
| --- | --- | --- |
| ReAct 循环 | 1、4、5 章 | 逐步展示思考 → 行动 → 观察 → 判断 |
| Plan-and-Execute | 2、6 章 | 任务分解与依赖调度 |
| 记忆检索 | 7 章 | 相似度打分与 Top-K 召回 |
| 工具调用 | 8 章 | 参数校验、限流与重试 |
| 多 Agent 协作 | 11 章 | 编排者 + 专家 + 审核闭环 |
| RAG 全链路 | 13 章 | 六阶段检索增强流程 |
| 上下文预算 | 3、9 章 | Token 占用可视化 |
| 安全护栏 | 15 章 | 四类输入的分级处置 |

---

## 快速开始

项目是纯静态站点，但内容通过 `fetch` 加载，**必须通过 HTTP 服务访问**（直接双击 `index.html` 会因浏览器安全策略无法读取章节）。

项目自带一个零依赖的静态服务器（Node ≥ 18）：

```bash
npm run dev                 # → http://127.0.0.1:5173/
node scripts/serve.mjs 8080 # 指定端口
```

其他等效方式（任选）：

```bash
python -m http.server 5173
npx --yes serve -p 5173 .
# 或 VS Code Live Server 插件 → 右键 index.html
```

### npm 脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动本地服务器（零依赖，跨平台） |
| `npm run validate` | 运行内容与结构校验（CI 用的同一个脚本） |
| `npm run user -- …` | 用户目录管理（新增 / 改密 / 停用 / 删除 / 查看） |
| `npm run e2e` | 浏览器交互回归测试（需要本机有 Chrome / Edge） |
| `npm run check-links` | 外链可用性检查（需要联网） |
| `npm run check-links` | 检查全部外链可用性（需要网络，不参与 CI） |
| `npm run e2e` | 浏览器交互回归测试（需 Node ≥ 22 与本地浏览器，先启动服务后用 `--base` 指定地址） |

> 修改内容后刷新浏览器即可生效，无需构建。**提交前建议先跑一次 `npm run validate`**，与 CI 结果一致。

各脚本的 Node 版本要求：`dev` / `validate` / `check-links` 需要 Node ≥ 18；`e2e` 因为要用全局 `WebSocket` 驱动 CDP，需要 Node ≥ 22（低版本会自动跳过并返回码 2，不会报错中断）。

### 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Ctrl / ⌘ + K` | 打开搜索面板 |
| `/` | 快速搜索 |
| `N` / `P` | 下一章 / 上一章 |
| `Esc` | 关闭面板 / 抽屉 |

---

## 账号与登录

平台需要登录后才能查看内容。仓库内置的初始管理员账号：

| 登录名 | 密码 | 角色 |
| --- | --- | --- |
| `lijian` | `1qaz2wsx` | 管理员 |

> **请先改掉这个密码。** 它公开写在文档和仓库里，等于没有。
> 登录后点右上角头像 → 账号设置 → 修改密码，然后按下面「新增用户」的流程导出并提交 `content/users.js`。

### 安全边界（必读）

本站是**纯静态站点，没有服务端**。因此这里的"登录"是**访问控制，不是安全防护**：

- 全部代码都在浏览器里，用开发者工具可以直接改变登录状态，密码复杂度不参与这个过程；
- 用户名单必须提交到仓库才能让别人登录，所以密码哈希是公开的，可以被离线分析；
- 加盐 + 迭代哈希（迭代式 SHA-256，默认 1000 轮，每用户独立随机盐）保证的是**不留下明文**、让同一密码在不同账号下无法比对、以及抬高离线爆破成本 —— 但它改变不了上面两条。

**结论：不要让任何人在这里使用其真实账号的密码，也不要在本平台存放敏感信息。**

如果需要真正的账号安全与多设备数据同步，必须接入后端服务。届时只需替换 `assets/js/auth.js` 里的 provider 实现，登录界面、用户管理、数据隔离这些上层代码都不用改。

### 新增用户

**方式一：管理后台（推荐）**

1. 用管理员账号登录 → 点右上角头像 → **用户管理** → **注册新用户**
2. 新账号会立刻出现在列表里，并且在**当前这台浏览器**上马上可以登录
3. 点 **下载 users.js**，覆盖项目根目录的 `content/users.js`
4. 提交推送：

   ```bash
   git add content/users.js
   git commit -m "chore: 新增用户 wangfang"
   git push
   ```

5. CI 校验通过后自动发布，约 1 分钟后**所有人**都能用这个账号登录

> **第 3~5 步不能省。** `content/users.js` 才是「谁能登录」的权威名单，管理后台里的改动只存在于你自己的浏览器。列表页顶部会一直提示还有几项未发布，不要忽略。

**方式二：命令行**

```bash
npm run user -- list                                  # 查看全部账号
npm run user -- add wangfang 'wf-2026-Study!'         # 新增（默认普通用户）
npm run user -- add lisi 'Pass#2026word' admin 李四    # 新增管理员并指定显示名
npm run user -- passwd wangfang 'NewPass#2026'        # 重置密码
npm run user -- disable wangfang                      # 停用
npm run user -- enable wangfang                       # 启用
npm run user -- role wangfang admin                   # 调整角色
npm run user -- remove wangfang                       # 删除
npm run user -- hash 'some-password'                  # 只生成一条凭据（手工编辑时用）
```

命令行与浏览器管理界面共用同一份校验和序列化实现（`assets/js/userdir.js`），所以两边写出的文件格式一致，不会互相覆盖出无意义的 diff。

**忘记密码**：平台没有自助找回，让管理员用「重置密码」或 `npm run user -- passwd` 重设。

### 防呆约束

以下限制同时存在于界面与校验脚本中，避免把自己锁在门外：

- 不能停用、降级或删除**自己正在使用的账号**
- 不能把**最后一个启用的管理员**停用、降级或删除
- 名单为空或没有启用的管理员时，`npm run validate` 会直接失败（那意味着没人能登录）
- 密码至少 8 位，不能与登录名相同

### 学习数据隔离

每个账号的学习数据存放在独立的存储键下：

```
agent-learning-platform:u:<登录名>:v1
```

登录成功后应用会先切到该账号的命名空间，然后才开始渲染，所以：

- 同一台浏览器上换账号登录，看到的是各自的进度、笔记与书签
- 退出再登录，数据仍在
- 早期版本（还没有账号功能）的数据存在旧键 `agent-learning-platform:v1`。首次以某个账号登录、且该账号尚无数据时，「账号设置」里会出现一次性迁移入口，迁移后旧键被清除

> **同一账号在不同设备上的进度不会同步。** 纯静态站点没有共享存储，浏览器本地数据不可能跨设备，这需要后端。

---

## CI / CD

提交代码后自动校验并发布到 GitHub Pages，**校验不通过则不会部署**，线上始终保留上一个可用版本。

```
git push  →  CI（校验）  →  通过  →  Build（打包）  →  Deploy（发布）
                          └─ 失败 ─→ 中止，线上不变
```

### 工作流一览

| 文件 | 触发时机 | 作用 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | push / PR / 手动 | 纯校验，不部署。用于 PR 门禁与快速反馈 |
| `.github/workflows/deploy-pages.yml` | push 到 `main`/`master` / 手动 | `validate → build → deploy` 三段式发布 |

两个工作流相互独立：PR 只跑 `ci.yml`；推送到主分支时两者都会跑（`ci.yml` 给出校验结论，`deploy-pages.yml` 自己再校验一次后发布）。

### 校验内容（`scripts/validate.mjs`）

这个脚本直接 **import 站点自身的 Markdown 渲染器**，所以"CI 通过的"就是"线上能渲染的"。

| 分组 | 检查项 |
| --- | --- |
| 关键文件 | 26 个必需文件存在且非空；**`.nojekyll` 必须存在** |
| 目录 | 章节 id 唯一、`tag` / `minutes` 合法、`title` / `summary` 非空 |
| 阅读路径 | 路径引用的章节 id 全部存在，无空数组误写 |
| 内容 | catalog 与 `content/chapters/*.md` 双向一致（无缺失、无孤儿文件） |
| 渲染 | 全部章节渲染成功；无残留 `:::`、无未解析围栏 / 粗体、TOC 非空 |
| 语法 | `::: demo / diagram / callout` 名称合法；容器开闭配对；代码块语言可识别 |
| 资源 | `index.html`、`:::figure`、图片语法引用的本地文件是否都存在 |
| 挂载点 | 脚本依赖的 DOM 挂载点齐备（含登录门禁与用户管理面板） |
| 内链 | 每处 `#/chapter/cXX#锚点` 引用的章节与锚点必须真实存在（改名/调整顺序时的安全网） |
| 时效性 | `updated` 格式合法、`volatile` 为布尔值，并汇总当前基准时间与快速变化章节 |
| 更新日志 | 版本号 / 日期格式、`level` 与条目类型合法性、日期倒序；**`changelog.current` 必须等于 `catalog.version`** |
| 密码哈希 | SHA-256 标准向量 + 迭代哈希 KAT。**算法一旦被改动，所有已存在账号的密码都会失效**，必须在合并前拦住 |
| 用户目录 | 登录名合法且不重复、凭据为 64 位十六进制、迭代次数不为零、**必须存在启用的管理员**、禁止出现明文字段 |
| 覆盖率 | 已注册但无人引用的演示组件会被提示 |

另有基线检查：单章正文过短（< 800 字）视为未完成并报错；过长的标题、过长的正文会给出警告。

CI 中还包含三类运行时检查：

1. **JS 语法检查**：`node --check` 覆盖 `assets/js/`、`scripts/` 与 `content/*.js`。
2. **HTTP 冒烟测试**：起真实服务，逐个断言关键资源返回 200，且 `.md` 的 `Content-Type` 不是 `text/html`（即没被 Jekyll 处理）。
3. **浏览器交互回归测试**（`scripts/e2e.mjs`）：通过 CDP 驱动真实浏览器点击，覆盖静态检查查不到的行为。共 8 组场景，含登录门禁（未登录不得泄露内容、错误密码不得放行）、用户管理后台、多账号数据隔离，以及「点击右侧目录应就地滚动而不是跳回首页」等既有回归点。环境里没有浏览器时返回码为 2，CI 会跳过并给出警告而不阻断部署。

> `e2e.mjs` 会用内置的初始管理员账号登录。它只在临时浏览器 profile 里操作，**不会修改仓库中的 `content/users.js`**；也可用环境变量 `E2E_USER` / `E2E_PASS` 指定其他账号。

### 首次接入步骤

1. 把项目推送到 GitHub 仓库的 `main` 分支：

   ```bash
   git init
   git add .
   git commit -m "init: Agent 学习平台"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```

2. 打开仓库 **Settings → Pages**，把 **Source** 设为 **GitHub Actions**（只需设置一次）。

3. 打开 **Actions** 标签页，可以看到 `CI` 与 `Deploy to GitHub Pages` 正在运行。

4. 全部变绿后访问：

   ```
   https://<你的用户名>.github.io/<仓库名>/
   ```

> 之后每次 `git push` 到 `main` 都会自动走一遍校验 + 发布，通常 1 分钟内完成。也可以在 **Actions** 页面手动触发 `workflow_dispatch`。

### 方式二：从分支直接发布（不使用 Actions）

1. **Settings → Pages → Source** 选择 **Deploy from a branch**。
2. Branch 选 `main`，目录选 `/ (root)`，保存。

> 这种方式下 `.nojekyll` 是**必需**的：GitHub Pages 默认会用 Jekyll 处理站点，会把 `content/chapters/*.md` 编译成 HTML，导致 `fetch` 取不到原始 Markdown。仓库根目录已包含该文件，请勿删除。
>
> 使用 Actions 方式时，产物是原样提供的静态文件，不经过 Jekyll。

### 常见问题

| 现象 | 原因与处理 |
| --- | --- |
| Actions 里显示 "Pages is not enabled" | 没有把 **Settings → Pages → Source** 设为 **GitHub Actions** |
| 页面能打开但章节一直加载失败 | `.nojekyll` 丢失，Markdown 被 Jekyll 转成了 HTML |
| 样式或脚本 404 | 用了绝对路径 `/assets/...`。本项目全部用相对路径，新增引用时请保持一致 |
| 校验失败导致没有部署 | 看 Actions 日志里 `node scripts/validate.mjs` 的具体报错行，本地跑 `npm run validate` 可复现 |

### 为什么可以在子路径下正常工作

- 所有资源引用都是**相对路径**（如 `assets/css/main.css`），不依赖站点根目录。
- 章节内容通过 `asset()` 基于 `document.baseURI` 解析，自动适配 `/<仓库名>/` 这类子路径。
- 路由使用 **Hash 路由**（`#/chapter/c01`），刷新页面不会 404，无需额外的 404 配置。

---

## 目录结构

```
.
├── index.html                     # 应用外壳
├── package.json                   # npm 脚本（无第三方依赖）
├── .nojekyll                      # 关闭 Jekyll（分支发布方式下必需）
├── .gitattributes                 # 统一换行符
├── .github/workflows/
│   ├── ci.yml                     # CI：内容校验 + 冒烟测试
│   └── deploy-pages.yml           # CD：validate → build → deploy
├── scripts/
│   ├── validate.mjs               # 内容与结构校验（复用站点渲染器）
│   ├── e2e.mjs                    # 浏览器交互回归测试（CDP 真实点击）
│   ├── user.mjs                   # 用户目录命令行工具
│   ├── check-links.mjs            # 外链可用性检查（需网络，手动运行）
│   └── serve.mjs                  # 零依赖本地静态服务器
├── assets/
│   ├── css/
│   │   ├── main.css               # 设计变量、主题、布局、响应式
│   │   ├── components.css         # 卡片、代码块、提示框、交互演示
│   │   ├── reader.css             # 正文排版、标注、页脚
│   │   └── auth.css               # 登录门禁、账号菜单、管理后台
│   └── js/
│       ├── app.js                 # 入口：路由、视图、进度、快捷键
│       ├── store.js               # 状态与 localStorage 持久化（按账号命名空间）
│       ├── crypto.js              # 纯 JS SHA-256 + 加盐迭代哈希
│       ├── userdir.js             # 用户目录纯逻辑：校验、签名、序列化
│       ├── auth.js                # 认证层：provider、会话、用户目录读写
│       ├── login.js               # 登录门禁、账号菜单、账号设置
│       ├── admin.js               # 用户管理后台
│       ├── markdown.js            # Markdown 渲染器
│       ├── highlight.js           # 轻量语法高亮
│       ├── diagrams.js            # 内嵌 SVG 示意图库
│       ├── demos.js               # 交互式演示组件
│       ├── search.js              # 全文索引与搜索面板
│       ├── annotate.js            # 高亮 / 笔记 / 书签
│       ├── content.js             # 章节内容加载
│       └── ui.js                  # 通用工具函数
├── content/
│   ├── catalog.js                 # 课程目录配置（模块 / 章节 / 阅读路径 / 时效性）
│   ├── changelog.js               # 更新日志数据（顶部栏版本入口的内容源）
│   ├── users.js                   # 用户名单（唯一数据源，只存加盐哈希）
│   └── chapters/
│       └── c01.md … c26.md        # 26 章正文
└── examples/
    └── support-agent/             # 完整可运行示例（零依赖，见其 README）
```

### 各章速览

| 部分 | 章节 | 内容 |
| --- | --- | --- |
| 第一部分 | c01–c04 | 基础概念：什么是 Agent、能力演进、模型的长处与短板、边界与风险 |
| 第二部分 | c05–c09 | 核心原理：主循环、规划、记忆、工具调用、上下文工程 |
| 第三部分 | c10–c15 | 架构设计：五大组件、单/多 Agent、框架选型、RAG、可观测、安全 |
| 第四部分 | c16–c23 | 实战与工程：五个案例、动手实验、成本工程、完整可运行项目 |
| 第五部分 | c24–c26 | 附录：延伸阅读、术语表、高频问题 FAQ |

---

## 如何新增一章

**第 1 步**：在 `content/catalog.js` 对应模块的 `chapters` 数组里登记：

```js
{
  id: 'c22', tag: 'mid', minutes: 15,
  title: '章节标题',
  summary: '一句话摘要，会显示在首页卡片与章节导语处。'
}
```

**第 2 步**：新建 `content/chapters/c22.md`，文件名必须与 `id` 一致。

**第 3 步**：如果这一章属于某个分级路径，把 `c22` 加进 `paths[].chapters`。

**第 4 步**：刷新页面。搜索索引会自动重建，无需其他配置。

`tag` 取值：`basic`（基础）、`mid`（核心）、`adv`（架构）、`lab`（实验）、`ref`（参考）。

两个可选字段用于**内容时效性**：

| 字段 | 作用 |
| --- | --- |
| `updated: 'YYYY-MM'` | 覆盖本章的信息基准时间。省略则用 `CATALOG.DEFAULT_UPDATED`（全站每次内容评审后统一更新） |
| `volatile: true` | 标记「快速变化」章节（涉及模型能力、框架、价格等）。阅读页会自动在正文顶部插入一条时效提醒 |

> 当前标记为快速变化的有 `c03`、`c12`、`c22`、`c23`。建议每季度复核这几个章节，并把 `DEFAULT_UPDATED` 一并推进。

---

## 如何记录一次更新

更新日志的数据在 `content/changelog.js`，界面（顶部栏版本入口 + 侧边栏入口）会自动读取。

**第 1 步**：在 `window.CHANGELOG.entries` 数组**开头**插入一条：

```js
{
  version: '1.4.0',
  date: '2026-09-25',
  level: 'minor',                    // major | minor | patch
  title: '一句话说明这次更新做了什么',
  items: [
    { type: 'feat', text: '新增了……' },
    { type: 'fix',  text: '修复了……（支持反引号行内代码）' }
  ]
}
```

**第 2 步**：把 `window.CHANGELOG.current` 改成同一个版本号。

**第 3 步**：把 `content/catalog.js` 的 `version` 也改成同一个版本号。

**第 4 步**：跑 `npm run validate`。校验脚本会检查版本号格式、日期格式、`level` 合法性、条目类型是否已定义，以及 **`changelog.current` 与 `catalog.version` 是否一致**。

`type` 可选值：`feat`（新增）、`fix`（修复）、`content`（内容）、`perf`（优化）、`chore`（工程）、`doc`（文档）。

> 版本号变化后，已访问过的用户会看到顶部栏入口出现提示点，点开面板后自动消除（已读状态记在浏览器 localStorage）。

---

## Markdown 扩展语法

除标准 Markdown（标题、列表、表格、引用、分割线、任务列表、行内样式）外，还支持：

### 提示框

```markdown
:::callout tip 自定义标题
支持 **Markdown** 内容。

- 也支持列表
:::
```

类型：`tip`（技巧）、`info`（说明）、`warn`（注意）、`danger`（风险）、`key`（核心要点）。标题可省略。

### 结构示意图

```markdown
:::diagram loop caption="图 1 · Agent 主循环"
:::
```

可用名称见 `assets/js/diagrams.js`：`loop`、`anatomy`、`memory`、`rag`、`multiAgent`、`layers`、`guardrail`、`toolSeq`、`planTree`。

### 交互式演示

```markdown
:::demo react-loop
:::
```

可用名称见 `assets/js/demos.js` 的 `DEMOS` 注册表。

### 图片与双栏

```markdown
:::figure src="assets/img/xxx.png" caption="图注文字"
:::

:::columns
左侧内容（可放 diagram）
---
右侧内容
:::
```

### 代码块

````markdown
```python {2-4} title="agent.py"
# {2-4} 用于高亮指定行范围
```
````

支持语言：`python`、`javascript`/`typescript`、`json`、`bash`、`yaml`、`sql`、`go`、`java`、`text`。

### 其他

- `==文字==` → 高亮标记
- `[[Ctrl]]` → 键帽样式

---

## 数据存储说明

所有学习数据（进度、笔记、书签、高亮、偏好）都保存在浏览器 **localStorage** 中，**按登录账号隔离**：

| 键名 | 内容 |
| --- | --- |
| `agent-learning-platform:u:<登录名>:v1` | 该账号的进度、笔记、书签、高亮、阅读设置 |
| `agent-learning-platform:session:v1` | 登录会话（勾选「保持登录」时写入 localStorage，否则写入 sessionStorage） |
| `agent-learning-platform:users-override:v1` | 管理员在管理后台的**未发布**改动 |
| `agent-learning-platform:v1` | 早期版本（无账号功能）的全局数据，会被一次性迁移 |

- **不上传任何服务器**，纯本地；换浏览器或清理浏览器数据会丢失。
- 换账号登录看到的是各自的数据，互不影响。
- 「我的面板 → 进度」里可以**导出 JSON** 备份，或导入恢复。
- 标注位置采用「引文 + 上下文前缀后缀 + 出现序号」定位，正文修改后大多仍能自动恢复。
- 用户名单不在 localStorage 里生效 —— 只有 `content/users.js` 才是权威名单，`users-override` 仅用于让管理员刷新后还能看到自己的改动。

---

## 浏览器兼容

需要支持 ES Modules、CSS 自定义属性与 `color-mix()` 的现代浏览器：

- Chrome / Edge 111+
- Safari 16.4+
- Firefox 113+

---

## 技术说明

- **零构建、零依赖**：没有 npm 依赖，没有打包步骤，源码即产物。
- **模块化**：Markdown 渲染、语法高亮、示意图库、演示组件、搜索索引各自独立，便于扩展。
- **无框架**：使用原生 ES Modules 与 Hash 路由，可直接部署到任意静态托管（GitHub Pages、对象存储、Nginx）。

如需在本地开发时看到实时效果，直接修改源码并刷新浏览器即可（服务端无缓存逻辑，`fetch` 使用了 `no-cache`）。
