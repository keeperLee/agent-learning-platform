/* ============================================================
   课程目录配置
   ------------------------------------------------------------
   新增章节：在 modules 中登记 → 在 content/ 下新建同名 .md 文件
   path 字段留空表示不属于任何分级路径（仅「全部」可见）
   ============================================================ */

window.CATALOG = {
  // 需与 content/changelog.js 的 current 保持一致（scripts/validate.mjs 会校验）
  version: '1.5.0',
  updatedAt: '2026-09',

  /* 分级阅读路径（递进关系：进阶包含入门，实战包含全部） */
  paths: [
    {
      id: 'all',
      name: '全部',
      emoji: '📚',
      level: '完整课程',
      desc: '完整课程体系，共 26 章，涵盖从概念到生产落地的全部内容，含成本工程、完整可运行项目与参考资源、术语表、FAQ。',
      chapters: null
    },
    {
      id: 'beginner',
      name: '入门',
      emoji: '🌱',
      level: '零基础 · 约 54 分钟',
      desc: '不需要任何 AI 背景。先建立「Agent 是什么、能做什么、有什么坑」的整体认知。',
      chapters: ['c01', 'c02', 'c03', 'c04']
    },
    {
      id: 'intermediate',
      name: '进阶',
      emoji: '🚀',
      level: '有基础 · 约 2.5 小时',
      desc: '掌握主循环、规划、记忆、工具调用与上下文工程 —— 这是写出可用 Agent 的核心能力。',
      chapters: ['c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'c07', 'c08', 'c09', 'c10', 'c11']
    },
    {
      id: 'advanced',
      name: '实战',
      emoji: '🎯',
      level: '工程化 · 完整课程',
      desc: '面向工程落地：框架选型、RAG、评估体系、安全护栏，五个行业实战案例、动手实验，以及参考资源与术语表。',
      chapters: null
    }
  ],

  /* 模块与章节 */
  modules: [
    {
      id: 'm1',
      name: '第一部分 · 基础概念',
      desc: '建立对 Agent 的正确认知框架',
      chapters: [
        {
          id: 'c01', tag: 'basic', minutes: 12,
          title: '什么是 AI Agent',
          summary: '用一个可判断的标准区分「Agent」与「普通 LLM 应用」，并给出 Agent 的最小定义。'
        },
        {
          id: 'c02', tag: 'basic', minutes: 14,
          title: '从脚本到 Agent：能力演进',
          summary: '梳理规则程序 → 机器学习 → LLM 应用 → Agent 的四级演进，理解每一级新增的能力。'
        },
        {
          id: 'c03', tag: 'basic', minutes: 15, volatile: true,
          title: 'LLM 作为 Agent 的大脑',
          summary: '模型的推理、指令遵循与工具调用能力如何构成 Agent 的决策中枢，以及它的固有短板。'
        },
        {
          id: 'c04', tag: 'basic', minutes: 13,
          title: '能力边界、幻觉与风险认知',
          summary: 'Agent 做不到什么，以及幻觉、错误累积、成本失控三类高频问题的成因。'
        }
      ]
    },
    {
      id: 'm2',
      name: '第二部分 · 核心原理',
      desc: 'Agent 得以运转的五个关键机制',
      chapters: [
        {
          id: 'c05', tag: 'mid', minutes: 18,
          title: '感知—规划—行动—反思：Agent 主循环',
          summary: '拆解 Agent 的运行时循环，理解终止条件、迭代预算与失败恢复的设计要点。'
        },
        {
          id: 'c06', tag: 'mid', minutes: 20,
          title: '规划与任务分解',
          summary: 'ReAct、Plan-and-Execute、Tree of Thoughts 三种规划范式的原理、代码与取舍。'
        },
        {
          id: 'c07', tag: 'mid', minutes: 18,
          title: '记忆机制',
          summary: '工作记忆、会话记忆与长期记忆的分层设计，以及写入、检索与遗忘策略。'
        },
        {
          id: 'c08', tag: 'mid', minutes: 20,
          title: '工具调用：从 Function Calling 到 MCP',
          summary: '工具描述怎么写、参数如何校验、错误怎么回灌，以及 MCP 协议解决了什么问题。'
        },
        {
          id: 'c09', tag: 'mid', minutes: 17,
          title: '上下文工程',
          summary: 'Agent 的「编程」其实是对上下文的编排：预算分配、信息压缩与提示结构。'
        }
      ]
    },
    {
      id: 'm3',
      name: '第三部分 · 架构设计',
      desc: '从能跑到能上生产',
      chapters: [
        {
          id: 'c10', tag: 'adv', minutes: 16,
          title: 'Agent 系统解剖：五大核心组件',
          summary: '推理内核、规划器、记忆、工具层、执行环境的职责划分与接口设计。'
        },
        {
          id: 'c11', tag: 'adv', minutes: 19,
          title: '单 Agent vs 多 Agent 架构',
          summary: '什么时候该拆多 Agent，常见的四种拓扑，以及避免「协作放大错误」的工程手段。'
        },
        {
          id: 'c12', tag: 'adv', minutes: 22, volatile: true,
          title: '编排框架选型',
          summary: 'LangGraph、AutoGen、CrewAI、Dify 等框架的定位差异与选型决策表。'
        },
        {
          id: 'c13', tag: 'adv', minutes: 20,
          title: 'RAG 与知识库架构',
          summary: '切分、嵌入、检索、重排的完整链路，以及 Agentic RAG 的新思路。'
        },
        {
          id: 'c14', tag: 'adv', minutes: 19,
          title: '可观测性、评估与迭代',
          summary: 'Trace、指标与评测集：让 Agent 的效果可度量、可回归、可优化。'
        },
        {
          id: 'c15', tag: 'adv', minutes: 18,
          title: '安全护栏与可靠性设计',
          summary: '提示注入、越权操作、数据泄露的防护体系，以及降级与人工兜底策略。'
        }
      ]
    },
    {
      id: 'm4',
      name: '第四部分 · 实战案例与实验',
      desc: '把原理落到具体业务场景',
      chapters: [
        {
          id: 'c16', tag: 'adv', minutes: 20,
          title: '案例一：智能客服 Agent',
          summary: '从意图识别到工单闭环，含知识库设计、转人工策略与效果指标。'
        },
        {
          id: 'c17', tag: 'adv', minutes: 20,
          title: '案例二：代码助手 Agent',
          summary: '代码检索、编辑、测试三段式架构，以及如何用测试结果做自我修正。'
        },
        {
          id: 'c18', tag: 'adv', minutes: 20,
          title: '案例三：数据分析 Agent',
          summary: 'NL2SQL 的可靠性设计、沙箱执行与图表生成，含看板式交付形态。'
        },
        {
          id: 'c19', tag: 'adv', minutes: 19,
          title: '案例四：深度研究 Agent',
          summary: '搜索—阅读—交叉验证—成文的研究循环，以及引用可溯源的做法。'
        },
        {
          id: 'c20', tag: 'adv', minutes: 21,
          title: '案例五：企业级落地经验',
          summary: '从 Demo 到生产的六个关卡：权限、成本、评估、灰度、运维与组织协作。'
        },
        {
          id: 'c21', tag: 'lab', minutes: 25,
          title: '动手实验：从零实现最小可用 Agent',
          summary: '只用标准库实现一个具备工具调用与循环控制的 Agent，约 150 行代码。'
        },
        {
          id: 'c22', tag: 'adv', minutes: 20, volatile: true,
          title: '成本工程与性能优化',
          summary: '算清 Agent 的成本账：为什么成本随步数近似二次增长，以及五个降本杠杆的量化收益。'
        },
        {
          id: 'c23', tag: 'lab', minutes: 28, volatile: true,
          title: '完整项目：可运行的客服 Agent',
          summary: '把前面所有机制组装成能跑的系统：零依赖、无 API Key 也能跑，含 33 项零成本测试。'
        }
      ]
    },
    {
      id: 'm5',
      name: '第五部分 · 附录与参考',
      desc: '查阅型内容，不需要顺序阅读',
      chapters: [
        {
          id: 'c24', tag: 'ref', minutes: 16,
          title: '延伸阅读与参考资源',
          summary: '官方文档、经典论文、开源项目、评测基准与优质长文，逐条标注其解决的问题与对应章节。'
        },
        {
          id: 'c25', tag: 'ref', minutes: 14,
          title: '术语表',
          summary: '60 余个中英对照术语，按主题归类，含一句话定义与易混概念辨析。'
        },
        {
          id: 'c26', tag: 'ref', minutes: 18,
          title: '高频问题 FAQ',
          summary: '20 个实际项目中最常卡住的问题，每题给明确判断依据而非「视情况而定」。'
        }
      ]
    }
  ]
};

/* ------------------------------------------------------------
   内容时效性
   ------------------------------------------------------------
   Agent 领域变化很快，所以每章都需要能回答「这份内容基于什么时间的信息」。

   · 全站默认基准时间见 DEFAULT_UPDATED
   · 单章可用 updated 字段覆盖，格式 YYYY-MM 或 YYYY-MM-DD
   · volatile: true 表示该章涉及快速变化的内容（模型能力、框架、价格），
     阅读页会自动在正文顶部插入一条时效提醒
   ------------------------------------------------------------ */
window.CATALOG.DEFAULT_UPDATED = '2026-09';

/* 便捷索引（由 app.js 使用） */
window.CATALOG.byId = (() => {
  const map = {};
  window.CATALOG.modules.forEach((m) => m.chapters.forEach((c) => {
    map[c.id] = {
      ...c,
      moduleId: m.id,
      moduleName: m.name,
      updated: c.updated || window.CATALOG.DEFAULT_UPDATED,
      volatile: !!c.volatile
    };
  }));
  return map;
})();

window.CATALOG.allChapters = (() => {
  const list = [];
  window.CATALOG.modules.forEach((m) => m.chapters.forEach((c) => list.push({
    ...c,
    moduleId: m.id,
    moduleName: m.name,
    updated: c.updated || window.CATALOG.DEFAULT_UPDATED,
    volatile: !!c.volatile
  })));
  return list;
})();
