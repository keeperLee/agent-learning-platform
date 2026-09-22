/* ============================================================
   用户目录 · 唯一数据源
   ------------------------------------------------------------
   导出时间 2026-09-20T10:44:09.930Z
   共 1 个账号（1 个管理员，0 个已停用）

   ⚠️ 这个文件是「谁能登录」的权威名单，会被提交到仓库并公开。
      这里只存加盐哈希，任何情况下都不要写入明文密码。

   【为什么名单要写在这个文件里】
   本站是纯静态站点，没有服务端，localStorage 又只属于单个浏览器。
   管理员在自己浏览器里新建的用户，别的浏览器根本看不到。
   所以要让所有人都能登录，名单必须落到这个文件里，随代码一起发布。

   【新增用户的流程】
   推荐：登录管理员账号 → 右上角头像 → 用户管理 → 注册新用户
        → 点「下载 users.js」→ 覆盖本文件 → 提交推送
        → CI 校验通过后自动发布，约 1 分钟全员可见

   命令行（适合批量或忘记密码）：
     npm run user -- add <用户名> <密码> [角色] [显示名]
     npm run user -- passwd <用户名> <新密码>
     npm run user -- disable <用户名>
     npm run user -- enable <用户名>
     npm run user -- role <用户名> <admin|member>
     npm run user -- remove <用户名>
     npm run user -- list

   生成单条凭据（手工编辑时用）：
     npm run user -- hash <密码>

   【字段说明】
     username            登录名，小写字母/数字/下划线，3~24 位
     displayName         界面上显示的姓名
     role                admin（可进用户管理）| member（只能学习）
     active              false 表示已停用，无法登录（保留审计记录用）
     credential          加盐迭代哈希，由 assets/js/crypto.js 生成
     mustChangePassword  首次登录时提示改密（播种账号用）
     createdAt/createdBy 审计信息，记录谁在什么时候加进来的
   ============================================================ */

window.USER_DIRECTORY = {
  version: 1,

  users: [
    {
      username: "lijian",
      displayName: "李健",
      role: "admin",
      active: true,
      credential: {
        algo: "sha256-iter-v1",
        iterations: 1000,
        salt: "67550ec22606a41b78f0fda28a6c7eb0",
        hash: "98e0070112d464ecf7edba843cd522e2b1e25b8d48aae547f2abc237ed30a387"
      },
      createdAt: "2026-09-20",
      createdBy: "system",
      mustChangePassword: true,
      note: "初始管理员账号"
    }
  ]
};
