# Three.js 实战：打造沉浸式科普展馆 3D 漫游体验

> 如何用 Three.js 将传统的图文科普升级为可交互的 3D 虚拟展馆？本文以「生命科技体验馆」项目为例，详解 360° 全景漫游的技术实现。

## 为什么需要 3D 沉浸式体验？

传统的科普展示方式——图文、视频，存在明显的局限性：

| 传统方式 | 问题 |
|----------|------|
| 图文阅读 | 被动接收，缺乏参与感 |
| 视频播放 | 线性叙事，无法自由探索 |
| 线下展馆 | 时空限制，覆盖人群有限 |

**3D 虚拟展馆的优势**：
- 用户可自由探索，主动获取信息
- 打破时空限制，随时随地访问
- 沉浸感强，信息留存率更高
- 支持 VR 设备，体验升级

## 项目成果

<div class="video-container">
  <video controls>
    <source src="/videos/中源协和生命科技体验馆.mp4" type="video/mp4">
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

**实现效果**：
- 360° 全景展厅漫游
- PC 端鼠标拖拽 + 滚轮缩放
- 移动端手势滑动 + 双指缩放
- 手机陀螺仪体感控制（VR 模式）
- 热点交互，点击展品查看详情

## 技术架构

```
┌─────────────────────────────────────────────────────┐
│                    用户交互层                        │
├──────────────┬──────────────┬──────────────────────┤
│   PC 鼠标     │   移动端触屏   │    陀螺仪 VR        │
└──────┬───────┴──────┬───────┴──────────┬───────────┘
       │              │                   │
       ▼              ▼                   ▼
┌──────────────────────────────────────────────────────┐
│                 Three.js 控制器                       │
├──────────────┬──────────────┬───────────────────────┤
│ OrbitControls│FirstPerson   │DeviceOrientation      │
│ 轨道控制      │Controls      │Controls               │
│ 旋转/缩放/平移│第一人称漫游   │设备方向感应            │
└──────────────┴──────────────┴───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│                 Three.js 核心                         │
│     Scene + Camera + Renderer + 全景球体              │
└──────────────────────────────────────────────────────┘
```

## 核心实现

### 1. 全景场景搭建

360° 全景的核心原理：将全景图片贴到一个球体内部，相机放在球心，用户转动视角就能看到不同方向的画面。

```javascript
// 创建场景、相机、渲染器
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,                                    // 视野角度
  window.innerWidth / window.innerHeight, // 宽高比
  0.1,                                   // 近裁剪面
  1000                                   // 远裁剪面
)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)

// 创建全景球体
const geometry = new THREE.SphereGeometry(500, 60, 40)
geometry.scale(-1, 1, 1)  // 翻转法线，让纹理显示在内侧

// 加载全景图片
const texture = new THREE.TextureLoader().load('panorama.jpg')
const material = new THREE.MeshBasicMaterial({ map: texture })
const sphere = new THREE.Mesh(geometry, material)
scene.add(sphere)

// 相机放在球心
camera.position.set(0, 0, 0)
```

**关键点**：`geometry.scale(-1, 1, 1)` 将球体法线翻转，这样纹理才能从内部可见。

### 2. OrbitControls：轨道控制

最常用的交互方式，支持鼠标和触屏。

```javascript
// 引入控制器
const controls = new THREE.OrbitControls(camera, renderer.domElement)

// 核心配置
controls.enableDamping = true    // 启用阻尼（惯性）
controls.dampingFactor = 0.05    // 阻尼系数
controls.enableZoom = true       // 允许缩放
controls.enablePan = false       // 禁用平移（全景不需要）
controls.rotateSpeed = -0.25     // 旋转速度（负值反转方向）

// 限制垂直旋转角度，防止翻转
controls.minPolarAngle = Math.PI * 0.25  // 最小仰角
controls.maxPolarAngle = Math.PI * 0.75  // 最大俯角

// 自动旋转（可选）
controls.autoRotate = true
controls.autoRotateSpeed = 0.5

// 动画循环中更新
function animate() {
  requestAnimationFrame(animate)
  controls.update()  // 阻尼效果需要持续更新
  renderer.render(scene, camera)
}
```

**交互映射**：

| 操作 | PC | 移动端 |
|------|-----|--------|
| 旋转 | 鼠标左键拖拽 | 单指滑动 |
| 缩放 | 滚轮 | 双指捏合 |

### 3. DeviceOrientationControls：陀螺仪 VR

让用户通过转动手机来环顾四周，带来真正的沉浸感。

```javascript
// 设备方向控制器
const controls = new THREE.DeviceOrientationControls(camera)

// 需要用户授权（iOS 13+）
function requestPermission() {
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(permission => {
        if (permission === 'granted') {
          controls.connect()
        }
      })
  } else {
    // 非 iOS 设备直接连接
    controls.connect()
  }
}

// 动画循环
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
```

**核心原理**：

控制器监听 `deviceorientation` 事件，获取设备的三个欧拉角：

```javascript
// alpha: 绕 Z 轴旋转（0-360°，指南针方向）
// beta:  绕 X 轴旋转（-180°-180°，前后倾斜）
// gamma: 绕 Y 轴旋转（-90°-90°，左右倾斜）

window.addEventListener('deviceorientation', (event) => {
  const alpha = event.alpha  // 方向
  const beta = event.beta    // 俯仰
  const gamma = event.gamma  // 翻滚
})
```

### 4. FirstPersonControls：第一人称漫游

适合需要在展馆中「行走」的场景。

```javascript
const controls = new THREE.FirstPersonControls(camera, renderer.domElement)

controls.movementSpeed = 100   // 移动速度
controls.lookSpeed = 0.1       // 视角转动速度
controls.lookVertical = true   // 允许上下看
controls.activeLook = true     // 鼠标控制视角

// 动画循环（需要传入时间增量）
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  controls.update(clock.getDelta())
  renderer.render(scene, camera)
}
```

**键盘操作**：
- W / 上箭头：前进
- S / 下箭头：后退
- A / 左箭头：左移
- D / 右箭头：右移

### 5. 多控制器切换

根据设备类型和用户选择，动态切换控制器：

```javascript
let currentControls

function initControls() {
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)

  if (isMobile && window.DeviceOrientationEvent) {
    // 移动端优先使用陀螺仪
    currentControls = new THREE.DeviceOrientationControls(camera)

    // 提供切换按钮，回退到 OrbitControls
    document.getElementById('switch-btn').onclick = () => {
      currentControls.disconnect()
      currentControls = new THREE.OrbitControls(camera, renderer.domElement)
    }
  } else {
    // PC 端使用轨道控制
    currentControls = new THREE.OrbitControls(camera, renderer.domElement)
  }
}
```

## 技术亮点

### 1. 阻尼效果提升体验

没有阻尼的旋转是「生硬」的，加上阻尼后有「惯性」，更自然。

```javascript
controls.enableDamping = true
controls.dampingFactor = 0.05  // 值越小，惯性越大
```

### 2. 响应式适配

监听窗口变化，保持渲染比例正确：

```javascript
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
```

### 3. 性能优化

```javascript
// 限制像素比，避免高分屏性能问题
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// 纹理压缩
texture.minFilter = THREE.LinearFilter  // 避免 mipmap 生成

// 按需渲染（静止时不渲染）
controls.addEventListener('change', () => {
  renderer.render(scene, camera)
})
```

## 踩坑记录

### 问题 1：iOS 陀螺仪权限

iOS 13 后需要用户主动授权，且必须在用户交互（如点击）中触发。

```javascript
// 必须在点击事件中请求
button.addEventListener('click', () => {
  DeviceOrientationEvent.requestPermission()
})
```

### 问题 2：全景图接缝

球体两端会有明显接缝，解决方案：

```javascript
// 使用立方体贴图代替球体
const loader = new THREE.CubeTextureLoader()
const texture = loader.load([
  'px.jpg', 'nx.jpg',  // 左右
  'py.jpg', 'ny.jpg',  // 上下
  'pz.jpg', 'nz.jpg'   // 前后
])
scene.background = texture
```

### 问题 3：移动端触摸冲突

全景旋转和页面滚动冲突，需要阻止默认行为：

```javascript
renderer.domElement.addEventListener('touchmove', (e) => {
  e.preventDefault()
}, { passive: false })
```

## 项目价值

### 业务价值
- 突破线下展馆的时空限制，7×24 小时在线
- 降低科普成本，一次开发，多端复用
- 提升品牌科技形象，差异化竞争

### 技术价值
- 完整的 Three.js 全景漫游解决方案
- 多端适配经验（PC/移动/VR）
- 可复用的控制器配置模板

## 写在最后

用 3D 技术重塑传统行业，是 Web 3D 开发者的机会。科普展馆、房产看房、汽车展厅、博物馆导览……这些场景都在等待被「沉浸式」改造。

Three.js 的三种控制器（Orbit、DeviceOrientation、FirstPerson）覆盖了绝大多数交互需求，掌握它们，你就能快速落地各种全景漫游项目。

**相关资源**：
- [Three.js 官方文档](https://threejs.org/docs/)
- [全景图制作工具 PTGui](https://www.ptgui.com/)
- [在线全景编辑器 Pannellum](https://pannellum.org/)
