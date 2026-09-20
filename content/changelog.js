/* ============================================================
   更新日志（唯一数据源）
   ------------------------------------------------------------
   新增一个版本：在 entries 数组开头插入一条，并同步更新 current
   与 content/catalog.js 的 version 字段（scripts/validate.mjs 会校验二者一致）
   ============================================================ */

window.CHANGELOG = {
  current: '1.3.0',

  /* 条目类型 → 展示文案与配色（样式见 components.css 的 .cl-tag.*） */
  types: {
    feat: { label: '新增', cls: 't-feat' },
    fix: { label: '修复', cls: 't-fix' },
    content: { label: '内容', cls: 't-content' },
    perf: { label: '优化', cls: 't-perf' },
    chore: { label: '工程', cls: 't-chore' },
    doc: { label: '文档', cls: 't-doc' }
  },

  entries: [
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
