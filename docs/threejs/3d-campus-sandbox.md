---
description: Three.js 3D 园区沙盘实战，实现建筑点击交互、环境反射、标识牌跟随相机的完整展示系统
---

# Three.js 实战：3D 园区沙盘展示与交互热点系统

> 如何用 Three.js 打造一个支持建筑点击交互、环境反射、标识牌跟随相机的 3D 园区沙盘展示系统？本文以「生命云视界」项目为例，详解完整实现。

## 为什么需要 3D 园区沙盘？

传统的园区展示方式（图片、视频、平面地图）无法直观呈现空间关系和建筑细节。3D 沙盘的优势：

| 维度 | 传统方式 | 3D 沙盘 |
|------|----------|---------|
| 空间感 | 平面呈现 | 立体直观 |
| 交互性 | 静态浏览 | 点击探索 |
| 信息量 | 有限展示 | 丰富弹窗 |
| 体验感 | 被动接收 | 主动探索 |

**应用场景**：企业园区展示、产业园招商、房地产沙盘、智慧城市可视化等。

## 项目成果

<div class="video-container">
  <video controls muted>
    <source src="/videos/3d-campus-sandbox.mp4" type="video/mp4">
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
- GLTF/GLB 园区模型加载
- 建筑点击热点交互（12个建筑）
- 环境贴图实现玻璃反射效果
- 标识牌始终面向相机（lookAt）
- 模型动画（旋转、呼吸等）
- OrbitControls 轨道控制（带限制）
- Element UI 弹窗展示图文/视频
- 背景音乐 + 加载进度条

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                      用户交互层                          │
│         点击建筑 | 拖拽旋转 | 缩放浏览                    │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                    射线拾取系统                          │
│      Raycaster → 检测点击物体 → 触发对应弹窗             │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                   Three.js 场景                          │
├─────────────┬─────────────┬─────────────────────────────┤
│  GLTFLoader │ 环境贴图     │      AnimationMixer        │
│  模型加载    │ 反射效果     │      模型动画               │
└─────────────┴─────────────┴─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                   标识牌系统                             │
│      lookAt(camera) → 始终面向用户                       │
└─────────────────────────────────────────────────────────┘
```

## 核心实现

### 1. 场景初始化与相机配置

```javascript
// 创建场景
let scene = new THREE.Scene()
scene.background = new THREE.Color(0xcce0ff)

// 创建相机（俯视角度看沙盘）
let camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  10000
)
// 45度俯视角
camera.position.set(300, 300, 300)

// 创建渲染器
renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)

// 开启阴影
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
```

### 2. 轨道控制器配置

限制缩放范围和旋转角度，保持沙盘的最佳观看视角：

```javascript
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

var controls = new OrbitControls(camera, renderer.domElement)

// 开启缩放和平移
controls.enableZoom = true
controls.enablePan = true

// 限制缩放距离
controls.minDistance = 350  // 最近
controls.maxDistance = 550  // 最远

// 限制上下旋转角度（防止看到底部）
controls.minPolarAngle = Math.PI / 12  // 约 15°
controls.maxPolarAngle = Math.PI / 2.5 // 约 72°
```

**角度限制说明**：

```
          Y
          │
          │ minPolarAngle (15°)
          │╱
          ┼─────────── X
         ╱│
        ╱ │ maxPolarAngle (72°)
       Z  │

限制俯仰角范围，始终保持俯视沙盘
```

### 3. GLTF 模型加载与环境贴图

```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

// 加载环境贴图（用于建筑反射）
const cubeLoader = new THREE.TextureLoader()
const textureCube = cubeLoader.load('hdr.jpg')
textureCube.mapping = THREE.SphericalReflectionMapping

// 加载模型
let loader = new GLTFLoader()

loader.load(
  'campus.glb',
  (gltf) => {
    // 设置模型缩放和位置
    gltf.scene.scale.set(0.15, 0.15, 0.15)
    gltf.scene.position.set(0, -40, 0)

    // 遍历模型，应用环境贴图
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        // 所有网格应用环境反射
        child.material.envMap = textureCube

        // 特定材质增强效果
        if (child.material.name === '材质') {
          // 自发光颜色（不受光照影响）
          child.material.emissive = new THREE.Color(0x333333)
          child.material.emissiveIntensity = 1
          // 环境贴图强度
          child.material.envMapIntensity = 1
        }

        // 开启阴影
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    scene.add(gltf.scene)
  },
  (xhr) => {
    // 加载进度
    const percent = Math.round(xhr.loaded / xhr.total * 100)
    updateLoadingUI(percent)
  }
)
```

### 4. 环境贴图映射模式

```javascript
// 球面反射映射（适合建筑玻璃）
textureCube.mapping = THREE.SphericalReflectionMapping

// 其他可选模式：
// THREE.EquirectangularReflectionMapping  // 等距柱状反射
// THREE.EquirectangularRefractionMapping  // 等距柱状折射
// THREE.CubeReflectionMapping             // 立方体反射
```

**效果对比**：

| 映射模式 | 特点 | 适用场景 |
|----------|------|----------|
| SphericalReflection | 球面反射，效果柔和 | 建筑玻璃、金属 |
| EquirectangularReflection | 全景反射，真实感强 | 高质量渲染 |
| CubeReflection | 六面体反射，经典方式 | 通用场景 |

### 5. 射线拾取实现建筑点击

```javascript
var raycaster = new THREE.Raycaster()

function raycast(event, touch = false) {
  var mouse = {}

  // 获取归一化坐标
  if (touch) {
    mouse.x = 2 * (event.changedTouches[0].clientX / window.innerWidth) - 1
    mouse.y = 1 - 2 * (event.changedTouches[0].clientY / window.innerHeight)
  } else {
    mouse.x = 2 * (event.clientX / window.innerWidth) - 1
    mouse.y = 1 - 2 * (event.clientY / window.innerHeight)
  }

  // 设置射线
  raycaster.setFromCamera(mouse, camera)

  // 检测相交（递归检测子对象）
  var intersects = raycaster.intersectObjects(scene.children, true)

  if (intersects[0]) {
    var object = intersects[0].object

    // 根据物体名称触发不同弹窗
    switch (object.name) {
      case '标识-科研大楼':
        showBuildingInfo('科研大楼', videoContent, textContent)
        break
      case '标识-医院血研所':
        showBuildingInfo('医院血研所', imageContent, textContent)
        break
      case '标识-未来实验室':
        showBuildingInfo('未来实验室', imageContent, textContent)
        break
      // ... 更多建筑
    }
  }
}

// 同时监听 PC 和移动端
window.addEventListener('click', e => raycast(e))
document.getElementById('webgl').addEventListener('touchend', e => raycast(e, true))
```

### 6. 弹窗展示（Element UI）

```javascript
// 展示建筑详情弹窗
function showBuildingInfo(title, mediaContent, textContent) {
  // 暂停背景音乐
  document.getElementById('audio').pause()

  // 使用 Element UI 的 $alert
  vue.$alert(
    `<div class="alert-box-img">${mediaContent}</div>
     <div class="alert-box-conter">
       <h1><b>${title}</b></h1>
       <p>${textContent}</p>
     </div>`,
    ' ',
    {
      dangerouslyUseHTMLString: true,
      showConfirmButton: false,
      callback: () => {
        // 关闭弹窗后恢复音乐
        document.getElementById('audio').play()
      }
    }
  )
}
```

### 7. 标识牌始终面向相机

让园区中的标识牌始终面向用户，提升可读性：

```javascript
async function tagAnimation() {
  // 等待模型加载完成
  let gltf = await loadModel()

  function lookCamera() {
    // 遍历所有标识牌子对象
    for (let child of gltf.scene.children[0].children) {
      // 让标识牌面向相机
      child.lookAt(camera.position)
    }
    requestAnimationFrame(lookCamera)
  }

  lookCamera()
}
```

**lookAt 原理**：

```javascript
// lookAt 方法让物体的 -Z 轴指向目标点
object.lookAt(targetPosition)

// 等效于：
// 1. 计算从物体到目标的方向向量
// 2. 构建旋转矩阵使 -Z 轴对齐该方向
// 3. 应用旋转到物体
```

### 8. 模型动画播放

```javascript
// 创建动画混合器
let mixer = new THREE.AnimationMixer(gltf.scene)

// 获取动画剪辑
let animations = gltf.animations
let idleAnim = THREE.AnimationClip.findByName(animations, 'animation_0')

// 创建动画动作并播放
let action = mixer.clipAction(idleAnim)
action.play()

// 渲染循环中更新动画
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)

  const delta = clock.getDelta()
  if (mixer) {
    mixer.update(delta)
  }

  renderer.render(scene, camera)
}
```

### 9. 加载进度条

```javascript
loader.load(
  'campus.glb',
  onLoad,
  (xhr) => {
    // 计算加载百分比
    const percent = Math.round(xhr.loaded / xhr.total * 100)

    // 更新 UI
    $('.loading-time').text(percent + '%')
    $('.line-x').css('width', percent + '%')

    // 加载完成后隐藏进度条
    if (percent === 100) {
      setTimeout(() => {
        $('.loading').css('display', 'none')
        document.getElementById('audio').play()
      }, 1000)
    }
  },
  onError
)
```

### 10. 背景音乐控制

```javascript
// 音乐播放/暂停切换
$('.app-header a').click(function() {
  const audio = document.getElementById('audio')

  if (audio.paused) {
    audio.play()
    $('.app-header').addClass('bg')  // 添加旋转动画
  } else {
    audio.pause()
    $('.app-header').removeClass('bg')
  }
})
```

```css
/* 音乐图标旋转动画 */
.bg {
  animation: zhuan 2s 0s linear infinite;
}

@keyframes zhuan {
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
}
```

## 技术亮点

### 1. 环境贴图增强材质真实感

一张 HDR 图片即可让所有建筑拥有反射效果：

```javascript
child.material.envMap = textureCube
child.material.envMapIntensity = 1
```

### 2. 标识牌跟随相机

无论用户如何旋转视角，标识牌始终正面朝向用户，信息清晰可读。

### 3. 异步模型加载

使用 Promise 封装加载过程，配合 async/await 优雅处理依赖关系：

```javascript
function getObj() {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => {
      // 处理模型...
      resolve(gltf)
    })
  })
}

let gltf = await getObj()
```

### 4. 响应式弹窗

根据点击的建筑动态展示不同内容（图片/视频/文字），丰富的信息呈现。

## 踩坑记录

### 问题 1：环境贴图不生效

**原因**：材质没有设置 `envMap` 或贴图映射模式不对。

**解决**：

```javascript
textureCube.mapping = THREE.SphericalReflectionMapping
child.material.envMap = textureCube
child.material.needsUpdate = true  // 强制更新
```

### 问题 2：标识牌方向错误

**原因**：模型导出时的朝向与 Three.js 默认朝向不一致。

**解决**：调整模型或在代码中预旋转。

### 问题 3：移动端触摸事件穿透

**原因**：弹窗打开后，底层的 3D 场景仍然响应触摸。

**解决**：检测弹窗状态，阻止事件处理：

```javascript
if ($('.el-message-box__wrapper').css('display') === 'block') {
  return  // 弹窗打开时不处理点击
}
```

## 项目价值

### 业务价值
- 为企业园区提供数字化展示方案
- 支持线上线下同步展示
- 丰富的交互提升用户参与度

### 技术价值
- 完整的 3D 园区沙盘解决方案
- 可复用的热点交互系统
- 环境贴图应用最佳实践

## 写在最后

3D 园区沙盘是企业数字化展示的重要形式。本项目核心技术点：

1. **环境贴图**：一图实现全场景反射
2. **射线拾取**：精准的建筑点击检测
3. **lookAt 跟随**：标识牌始终面向用户
4. **动画系统**：模型动画增强活力
5. **弹窗交互**：丰富的信息呈现

掌握这些技术，你就能快速打造专业级的 3D 园区展示系统。
