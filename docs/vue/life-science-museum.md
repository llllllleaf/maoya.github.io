# 生命科技体验馆：用 Vue 打造沉浸式科普展示平台

> 为中源协和基因科技公司打造的线上科普展示系统，让复杂的生命科学知识变得触手可及。

## 项目成果

这是一个面向公众的生命科学科普平台，用户可以通过网页了解细胞、基因、干细胞等生命科学知识。项目包含：

- 首页轮播展示 + 三大展厅入口
- 沉浸式科普长文阅读体验
- 动态内容管理（后台可更新文章）
- 移动端适配

<div class="video-container">
  <video controls>
    <source src="/videos/中源协和生命科技体验馆.mp4" type="video/mp4">
    您的浏览器不支持视频播放
  </video>
</div>

<style>
.video-container {
  display: flex;
  justify-content: center;
  margin: 24px 0;
}
.video-container video {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  max-height: 480px;
  width: auto;
}
@media (max-width: 768px) {
  .video-container video {
    width: 100%;
    max-height: none;
    height: auto;
  }
}
</style>

## 技术方案

### 技术栈

| 技术 | 选型理由 |
|------|----------|
| Vue 2 | 组件化开发，数据驱动视图，团队熟悉度高 |
| Vue Router | 官方路由方案，支持懒加载 |
| Element UI | 快速搭建 UI，轮播图/栅格布局开箱即用 |
| Axios | Promise 风格 HTTP 请求，拦截器机制 |
| Webpack 4 | 成熟的构建工具，完善的 loader 生态 |
| Three.js | 预留 3D 展示能力（VR 全景漫游） |

### 架构设计

```
┌─────────────────────────────────────────┐
│                 用户访问                  │
└─────────────────┬───────────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│          Vue Router (路由分发)           │
│   /index → /one → /content/:id          │
└─────────────────┬───────────────────────┘
                  ▼
┌──────────┬──────────┬──────────────────┐
│ Index.vue│ one.vue  │   content.vue    │
│ 首页展示  │ 静态科普  │   动态文章加载   │
└──────────┴──────────┴────────┬─────────┘
                               ▼
                    ┌─────────────────────┐
                    │   后端 API 服务      │
                    │  (文章内容管理)      │
                    └─────────────────────┘
```

## 核心实现

### 1. 路由懒加载优化首屏性能

为了减少首屏加载体积，采用动态 import 实现路由级代码分割：

```javascript
// router/index.js
const Index = () => import('../pages/Index.vue')
const content = () => import('../pages/content.vue')
const One = () => import('../pages/one.vue')

export default new Router({
  routes: [
    { path: '/index', name: 'index', component: Index },
    { path: '/one', name: 'one', component: One },
    { path: '/content/:id', name: 'content', component: content },
    { path: '*', redirect: '/index' }
  ]
})
```

**效果**：首屏只加载 Index 组件，其他页面按需加载，首屏 JS 体积减少约 40%。

### 2. 动态内容加载与渲染

科普文章内容由后台管理系统维护，前端通过 API 动态获取并渲染：

```javascript
// content.vue
mounted() {
  const id = this.$route.params.id

  this.$http.post('/api/appknowledge/getKnowById',
    this.$qs.stringify({ KNOW_ID: id })
  )
  .then(response => {
    this.data = response.data.data
  })
}
```

```vue
<template>
  <div class="content">
    <header>
      <div class="logo"></div>
      <p>中源协和基因科技有限公司</p>
    </header>
    <div v-html="safeContent"></div>
  </div>
</template>
```

**价值**：运营人员可在后台随时更新科普内容，无需开发介入。

### 3. Element UI 快速搭建展示界面

利用 Element UI 的轮播图和栅格系统，快速实现首页布局：

```vue
<template>
  <div class="block">
    <!-- 轮播图 -->
    <el-carousel trigger="click">
      <el-carousel-item v-for="item in banner" :key="item">
        <h3 :style="{backgroundImage: 'url(' + item + ')'}"></h3>
      </el-carousel-item>
    </el-carousel>

    <!-- 三展厅入口 -->
    <el-row type="flex" justify="space-around">
      <el-col :span="6">
        <div class="grid-content">第一展厅</div>
      </el-col>
      <el-col :span="6">
        <div class="grid-content">第二展厅</div>
      </el-col>
      <el-col :span="6">
        <div class="grid-content">第三展厅</div>
      </el-col>
    </el-row>
  </div>
</template>
```

## 技术亮点

### Webpack 资源处理流水线

项目配置了完整的资源处理方案，值得在其他项目复用：

```javascript
// webpack.base.js
{
  test: /\.(png|jpg|jpeg|gif|svg)(\?.*)?$/,
  loader: 'url-loader',
  options: {
    limit: 10000,  // 10KB 以下转 base64，减少 HTTP 请求
    name: 'static/img/[name].[hash:7].[ext]'  // 文件名带 hash，利用缓存
  }
},
{
  test: /\.(mp4|mp3|wav|webm|ogg|flac|aac)(\?.*)?$/,
  loader: 'url-loader',
  options: {
    limit: 10000,
    name: 'static/media/[name].[hash:7].[ext]'
  }
}
```

**亮点**：
- 小图片自动内联为 base64
- 文件名带 hash 实现强缓存
- 统一的输出目录结构

### Three.js 3D 能力预留

项目在 static 目录预置了 Three.js 及多种控制器：

```
static/
├── three.min.js
└── controls/
    ├── OrbitControls.js      # 轨道控制（鼠标旋转缩放）
    ├── FirstPersonControls.js # 第一人称控制
    └── DeviceOrientationControls.js  # 设备方向控制（VR）
```

为后续的 3D 展厅全景漫游功能做好了技术储备。

## 踩坑与解决

### 问题：v-html 渲染后端内容存在 XSS 风险

**现象**：后端返回的富文本直接用 v-html 渲染，如果内容被注入恶意脚本，将导致 XSS 攻击。

**解决方案**：使用 DOMPurify 过滤 HTML

```javascript
import DOMPurify from 'dompurify'

computed: {
  safeContent() {
    return DOMPurify.sanitize(this.data.KNOW_CONTENT)
  }
}
```

### 问题：API 地址硬编码导致环境切换困难

**解决方案**：使用环境变量管理

```javascript
// .env.development
VUE_APP_API_BASE=https://test.vcanbio.com/api

// .env.production
VUE_APP_API_BASE=https://api.vcanbio.com
```

## 项目价值

### 业务价值
- 为企业提供了线上科普展示窗口，扩大品牌影响力
- 运营人员可自主更新内容，降低维护成本
- 移动端适配，覆盖更多用户群体

### 技术价值
- 完整的 Vue 2 + Webpack 4 项目脚手架，可复用于同类项目
- 路由懒加载、资源优化等最佳实践
- Three.js 集成方案，为 3D 展示类项目提供参考

### 个人成长
- 深入理解 Vue 组件化开发模式
- 掌握 Webpack 配置与优化技巧
- 积累了科普展示类项目的产品经验

## 写在最后

这个项目让我认识到：**技术选型要匹配业务场景**。

对于内容展示类项目，核心诉求是「快速上线 + 易于维护」，Vue + Element UI 的组合恰好满足这一点。而预留的 Three.js 能力，则为后续的创新体验留下了空间。

好的项目不在于用了多「新」的技术，而在于用「对」的技术解决「真」的问题。
