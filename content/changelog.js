/* ============================================================
   更新日志（唯一数据源）
   ------------------------------------------------------------
   新增一个版本：在 entries 数组开头插入一条，并同步更新 current
   与 content/catalog.js 的 version 字段（scripts/validate.mjs 会校验二者一致）
   ============================================================ */

window.CHANGELOG = {
  current: '1.5.1',

  /* 条目类型 → 展示文案与配色（样式见 components.css 的 .cl-tag.*） */
  types: {
    feat: { label: '新增', cls: 't-feat' },
    fix: { label: '修复', cls: 't-fix' },
    content: { label: '内容', cls: 't-content' },
    perf: { label: '优化', cls: 't-perf' },
    chore: { label: '工程', cls: 't-chore' },
    doc: { label: '文档', cls: 't-doc' },
    security: { label: '安全', cls: 't-fix' }
  },

  entries: [
    {
      version: '1.5.1',
      date: '2026-09-23',
      level: 'patch',
      title: '修复全站提示框未渲染，并挂上配套项目 mini-rag',
      items: [
        { type: 'fix', text: '修复 `:::callout <类型> [标题]` 完全没有渲染成提示框的问题。渲染器只认 `:::<类型>` 这一种写法，于全站 26 章共 144 处提示框全部退化成普通段落，**并且标题被静默丢弃**——页面上看不到任何报错，只是「注意事项 / 风险提示 / 核心要点」这些框变成了普通文字，标题整段消失' },
        { type: 'fix', text: '校验脚本新增提示框一致性检查：比对源文件 `:::callout` 数量与渲染结果中 `.callout` 容器的数量，并逐条核对标题是否真的出现在渲染结果里。这类「校验规则与渲染实现约定不一致」的问题此前完全无法被发现' },
        { type: 'content', text: '第 13 章「RAG 与知识库架构」新增动手入口：配套项目 mini-rag 把本章讲的同一条链路从零手写实现，加载 → 切分 → 向量化 → 存储 → 检索 → 生成六个环节各自一个脚本，且默认用本地免费向量模型，没有 API Key 也能跑通建库与检索' },
        { type: 'content', text: '第 8 章「工具调用」在 MCP 一节后新增入口：mini-rag 的 `mcp_server.py` 是一个真实的 MCP Server 实现，可对照源码看协议层实际要处理哪些事' }
      ]
    },
    {
      version: '1.5.0',
      date: '2026-09-20',
      level: 'minor',
      title: '新增登录门禁与用户体系，学习数据按账号隔离',
      items: [
        { type: 'feat', text: '新增登录门禁：未登录时页面不渲染任何学习内容，顶栏、侧边栏、章节树整体隐藏，搜索索引也不会建立' },
        { type: 'feat', text: '新增用户管理后台：注册用户、启停账号、调整角色、重置密码、删除账号，并展示角色与状态标签' },
        { type: 'feat', text: '学习进度、笔记、书签与标注改为按账号隔离存储（键名 `agent-learning-platform:u:<用户名>:v1`），并提供「启用账号功能之前」的本机旧数据迁移' },
        { type: 'feat', text: '新增账号设置：修改显示名与备注、自助修改密码（需校验原密码）、查看会话有效期' },
        { type: 'feat', text: '新增命令行用户管理工具：`npm run user -- list / add / passwd / disable / enable / role / remove / hash`，适合忘记密码或批量开号' },
        { type: 'security', text: '密码采用加盐迭代哈希（迭代式 SHA-256，默认 1000 轮，每用户独立随机盐），全程不保存明文；登录失败与用户不存在的耗时保持一致，避免探测账号是否存在' },
        { type: 'security', text: '登录页与用户管理页固定展示安全边界说明：纯静态站点没有服务端，登录属于访问控制而非安全防护，请勿使用真实密码' },
        { type: 'chore', text: 'CI 新增密码算法锁定检查（SHA-256 标准向量 + 迭代哈希 KAT），算法被误改动会让所有已存在密码失效，必须在合并前拦住' },
        { type: 'chore', text: 'CI 新增用户目录校验：登录名合法且唯一、凭据为 64 位十六进制、必须存在启用的管理员、禁止出现明文字段' },
        { type: 'chore', text: '交互回归测试新增 3 组场景共 26 项断言：登录门禁与错误密码、用户管理后台、多账号数据隔离' },
        { type: 'chore', text: '用户目录序列化逻辑抽到 assets/js/userdir.js，浏览器管理界面与命令行工具共用同一份实现，避免导出格式漂移' }
      ]
    },
    {
      version: '1.4.0',
      date: '2026-09-20',
      level: 'minor',
      title: '新增完整可运行项目、成本工程专章与阅读设置',
      items: [
        { type: 'feat', text: '新增 `examples/support-agent`：零依赖、没有 API Key 也能跑通的完整客服 Agent，含 33 项零成本测试；对应第 23 章' },
        { type: 'content', text: '新增第 22 章「成本工程与性能优化」：解释成本为何随步数近似二次增长，并给出五个降本杠杆的量化收益' },
        { type: 'feat', text: '新增阅读设置：正文字号 / 行距 / 版心宽度 / 正文字体四组选项，即时生效并持久化' },
        { type: 'feat', text: '新增内容时效性标注：每章显示信息基准时间，快速变化的章节自动插入时效提醒' },
        { type: 'chore', text: '校验脚本新增内链校验（章节与锚点必须真实存在）与时效字段格式校验' },
        { type: 'chore', text: '交互测试新增场景 5：阅读设置即时生效 / 持久化 / 恢复默认，以及时效提醒是否出现' },
        { type: 'doc', text: '课程扩充到 26 章，附录顺延为 c24 / c25 / c26' }
      ]
    },
    {
      version: '1.3.0',
      date: '2026-09-20',
      level: 'minor',
      title: '新增更新日志入口',
      items: [
        { type: 'feat', text: '顶部栏新增版本入口，任意章节都能随时打开历史更新记录' },
        { type: 'feat', text: '存在未读版本时入口显示提示点，打开后自动消除' },
        { type: 'feat', text: '侧边栏底部新增「更新日志」入口，移动端同样可达' },
        { type: 'chore', text: '新增 content/changelog.js 作为版本记录的唯一数据源，校验脚本会检查它与 catalog 的版本号是否一致' }
      ]
    },
    {
      version: '1.2.1',
      date: '2026-09-20',
      level: 'patch',
      title: '修复交互测试在 CI 上无法运行',
      items: [
        { type: 'fix', text: 'scripts/e2e.mjs 使用全局 WebSocket 驱动 CDP，而该对象自 Node 22 才提供，导致 CI 的 Node 20 环境直接抛错。CI 与部署工作流的 Node 版本统一升到 22' },
        { type: 'fix', text: 'e2e 增加运行时版本守卫：缺少全局 WebSocket 时返回码 2 跳过，不再硬失败阻断部署' },
        { type: 'doc', text: 'README 补充各脚本的 Node 版本要求' }
      ]
    },
    {
      version: '1.2.0',
      date: '2026-09-20',
      level: 'minor',
      title: '修复目录跳转，交互回归纳入 CI',
      items: [
        { type: 'fix', text: '修复点击右侧「本篇目录」会跳回首页的问题。原因是目录链接为裸锚点（#锚点），而它位于 #viewRoot 之外，点击拦截未生效；地址栏变更后 hashchange 把锚点误判为路由并回退到首页' },
        { type: 'fix', text: 'parseRoute 不再把不以 / 开头的 hash 当作路由；页内锚点不触发重渲染' },
        { type: 'fix', text: '深链接首次定位改为立即跳转并做一次位置校正，不再受平滑滚动动画影响' },
        { type: 'perf', text: '目录链接改为完整路由，中键、复制链接、新标签页打开均可用' },
        { type: 'feat', text: '锚点点击统一在 document 层拦截，同时覆盖右侧目录、正文标题锚点与 Markdown 锚点' },
        { type: 'chore', text: '新增 scripts/e2e.mjs：通过 CDP 驱动真实浏览器点击的交互回归测试，4 组场景 11 项断言，已接入 CI' }
      ]
    },
    {
      version: '1.1.0',
      date: '2026-09-20',
      level: 'minor',
      title: '新增附录三章，课程扩充到 24 章',
      items: [
        { type: 'content', text: '新增第五部分「附录与参考」，并引入 ref 章节标签' },
        { type: 'content', text: '第 22 章「延伸阅读与参考资源」：官方文档、经典论文、开源项目、评测基准、优质长文，逐条标注其解决的问题与对应章节' },
        { type: 'content', text: '第 23 章「术语表」：60 余个中英对照术语，按 8 个主题归类，含易混概念辨析' },
        { type: 'content', text: '第 24 章「高频问题 FAQ」：20 个实战问题，每题给明确判断依据' },
        { type: 'chore', text: '新增 scripts/check-links.mjs 外链可用性检查，66 个外链全部实测通过' }
      ]
    },
    {
      version: '1.0.0',
      date: '2026-09-18',
      level: 'major',
      title: '首次发布',
      items: [
        { type: 'feat', text: '21 章结构化课程，覆盖基础概念、核心原理、架构设计、实战案例四部分' },
        { type: 'feat', text: '8 个交互式演示：ReAct 循环、任务分解、记忆检索、工具调用、多 Agent 协作、RAG 全链路、上下文预算、安全护栏' },
        { type: 'feat', text: '自研 Markdown 渲染器与语法高亮，支持 callout / diagram / demo / figure / columns 扩展语法' },
        { type: 'feat', text: '学习功能：阅读进度跟踪、分级阅读路径、笔记标注、书签、全局搜索（Ctrl + K）' },
        { type: 'feat', text: '深色 / 浅色 / 跟随系统三态主题，响应式布局适配桌面与移动端' },
        { type: 'chore', text: '零依赖纯静态实现，可直接部署到 GitHub Pages 子路径' },
        { type: 'chore', text: '建立 CI/CD：内容校验脚本 scripts/validate.mjs、GitHub Actions 自动校验与发布' }
      ]
    }
  ]
};
