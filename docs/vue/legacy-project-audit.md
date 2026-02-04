# Vue 2 遗留项目代码审计实战

> 以「生命科技体验馆」项目为例，系统性分析 2018-2019 年老项目的技术债务，并给出可落地的改进方案。

## 项目背景

在日常工作中，我们经常会接手一些历史遗留项目。这些项目可能已经稳定运行多年，但技术栈老旧、依赖过时、存在安全隐患。本文以我 2018-2019 年开发的「生命科技体验馆」项目为例，演示如何对 Vue 2 遗留项目进行系统性审计。

**项目信息**
- 技术栈：Vue 2.5 + Webpack 4 + Element UI + Axios
- 开发时间：2018-2019
- 功能定位：生命科学科普展示系统

## 审计流程

### Step 1：文件结构扫描

首先排除噪音文件（node_modules、lock 文件、静态资源），梳理核心代码结构：

```
src/
├── main.js              # 入口文件
├── App.vue              # 根组件
├── router/index.js      # 路由配置
├── pages/               # 页面组件
│   ├── Index.vue        # 首页
│   ├── one.vue          # 科普内容页
│   └── content.vue      # 动态详情页
└── assets/              # 静态资源
```

### Step 2：依赖健康度检查

通过 `package.json` 分析依赖版本：

```json
{
  "dependencies": {
    "vue": "^2.5.16",        // 当前 3.4.x
    "axios": "^0.18.0",      // 当前 1.6.x，存在已知漏洞
    "element-ui": "^2.4.5",  // 当前 2.15.x
    "vux": "^2.9.2"          // 已停止维护
  }
}
```

**风险评估**：
- axios 0.18.0 存在 SSRF 和 DoS 漏洞（CVE-2019-10742）
- vux 已停止维护，无安全更新

### Step 3：代码质量分析

#### 问题 1：路由参数格式错误

```javascript
// router/index.js
{
  path: '/content:id',  // 错误：缺少斜杠
  component: content
}
```

正确写法：

```javascript
{
  path: '/content/:id',  // 动态参数前需要斜杠
  component: content
}
```

#### 问题 2：XSS 安全漏洞

```vue
<!-- content.vue -->
<div v-html="data.KNOW_CONTENT"></div>
```

直接使用 `v-html` 渲染后端返回的 HTML，如果后端数据被污染，将导致存储型 XSS 攻击。

**修复方案**：

```javascript
import DOMPurify from 'dompurify'

computed: {
  safeContent() {
    return DOMPurify.sanitize(this.data.KNOW_CONTENT)
  }
}
```

```vue
<div v-html="safeContent"></div>
```

#### 问题 3：硬编码 API 地址

```javascript
// 问题代码
that.$http.post('http://test.vcanbio.com/vcanbio_test/...')
```

**问题**：
1. 使用 HTTP 而非 HTTPS，数据明文传输
2. 测试环境地址硬编码在代码中
3. 无法区分开发/生产环境

**修复方案**：

```javascript
// .env.development
VUE_APP_API_BASE=https://test.vcanbio.com/api

// .env.production
VUE_APP_API_BASE=https://api.vcanbio.com

// 代码中使用
this.$http.post(`${process.env.VUE_APP_API_BASE}/appknowledge/getKnowById`)
```

#### 问题 4：ESLint 被禁用

```javascript
// webpack.base.js
/*{
  test: /\.(js|vue)$/,
  loader: 'eslint-loader',
  ...
},*/
```

代码检查被注释，无法保证代码质量一致性。

## 亮点代码

项目也有值得学习的地方：

### 路由懒加载

```javascript
const Index = () => import('../pages/Index.vue')
const content = () => import('../pages/content.vue')
```

正确使用动态 import 实现代码分割，减少首屏加载体积。

### Webpack 资源处理

```javascript
{
  test: /\.(png|jpg|jpeg|gif|svg)(\?.*)?$/,
  loader: 'url-loader',
  options: {
    limit: 10000,  // 10KB 以下转 base64
    name: 'static/img/[name].[hash:7].[ext]'
  }
}
```

完整的资源处理配置，小图片内联、大图片输出并带 hash。

## 改进优先级

| 优先级 | 问题 | 影响 | 工作量 |
|--------|------|------|--------|
| P0 | XSS 漏洞 | 安全 | 1h |
| P0 | HTTP → HTTPS | 安全 | 0.5h |
| P1 | 路由参数修复 | 功能 | 0.5h |
| P1 | axios 升级 | 安全 | 2h |
| P2 | 启用 ESLint | 质量 | 1h |
| P3 | Vue 3 迁移 | 长期 | 1-2w |

## 迁移建议

对于此类遗留项目，建议分阶段迁移：

**阶段一（紧急）**：修复安全漏洞
- 添加 DOMPurify
- 升级 axios
- 改用 HTTPS

**阶段二（短期）**：代码质量提升
- 启用 ESLint
- 添加 TypeScript
- 统一代码风格

**阶段三（长期）**：技术栈升级
- Vue 2 → Vue 3
- Webpack → Vite
- Element UI → Element Plus

## 总结

遗留项目审计的核心思路：
1. **先扫描，后深入**：快速了解全貌，再针对性分析
2. **安全优先**：XSS、CSRF、依赖漏洞是第一优先级
3. **渐进式改进**：不要试图一步到位，分阶段推进
4. **保留亮点**：老项目也有值得学习的地方

通过系统性的代码审计，我们可以快速识别技术债务，制定合理的改进计划，让遗留项目焕发新生。
