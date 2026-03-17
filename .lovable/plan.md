

## 后台管理系统认证改造：Supabase Auth 替换硬编码密码

### 现状
- 管理后台使用硬编码密码 `shop2024` 验证（`src/lib/store.ts` 第4行）
- 任何知道密码的人都可以访问，无法追踪管理员身份

### 方案

#### 1. 创建管理员登录页面
- 改造 `AdminRates.tsx` 的登录部分，从密码输入改为 **邮箱 + 密码** 登录表单
- 使用 `supabase.auth.signInWithPassword()` 进行认证
- 监听 `onAuthStateChange` 管理会话状态
- 添加登出按钮到管理面板侧边栏

#### 2. 创建管理员角色表（安全）
- 创建 `user_roles` 表 + `app_role` 枚举类型（admin/user）
- 创建 `has_role()` security definer 函数，用于 RLS 策略中检查角色
- 登录后验证用户是否具有 `admin` 角色，非管理员拒绝访问

#### 3. 收紧 RLS 策略
- `api_keys` 表：SELECT/UPDATE 限制为 admin 角色
- `rates` 表：写入操作限制为 admin 角色，读取保持公开

#### 4. 提供管理员注册入口
- 暂不做公开注册页面，通过数据库手动插入第一个管理员
- 在管理面板内提供「创建管理员账号」功能（仅现有管理员可操作）
- 或提供一个简单的注册表单（首次使用时）

#### 5. 文件变更

| 文件 | 变更 |
|---|---|
| `supabase/migrations/` | 新建 `user_roles` 表、`has_role` 函数、收紧 RLS |
| `src/pages/AdminRates.tsx` | 登录改为 Supabase Auth，添加登出，检查 admin 角色 |
| `src/lib/store.ts` | 移除 `ADMIN_PASS` 和 `verifyAdminPassword` |
| `src/lib/i18n.tsx` | 添加邮箱/密码/登出等翻译文案 |

#### 6. 首次管理员设置
- 提供「注册管理员」表单，当数据库中没有任何管理员时，第一个注册的用户自动成为 admin
- 后续管理员需由现有管理员手动添加

