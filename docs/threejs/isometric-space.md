---
description: Three.js 等距空间 3D 品牌展厅实战，实现多层叠加、交互切换、动画效果和后处理的完整方案
---

# Three.js 实战：等距空间 3D 品牌展厅的完整实现

> 如何用 Three.js 打造一个多层叠加、可交互切换、带动画效果的等距视角 3D 品牌展厅？本文以「等距空间」项目为例，详解从模型加载到后处理的全流程。

## 为什么选择等距空间？



- 视觉冲击力强，适合品牌展示
- 层次分明，信息传达清晰
- 艺术感强，区别于传统 3D 漫游

**应用场景**：品牌展厅、产品发布、年度庆典、数字藏品等。

## 项目成果

<div class="video-container">
  <video controls>
    <source src="/videos/等距空间.mp4" type="video/mp4">
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
- 5 层等距空间叠加展示
- 点击热点切换场景 + 视角动画
- GLTF 模型 + DRACO 压缩（体积减少 70%+）
- HDR 环境贴图实现真实材质
- 物理材质：玻璃、金属质感
- 后处理：景深效果 + FXAA 抗锯齿
- 背景音乐 + 加载进度条

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                      用户界面层                          │
│     加载进度条 | 音乐控制 | 热点交互提示                   │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                    Three.js 场景                         │
├─────────────┬─────────────┬─────────────────────────────┤
│  GLTFLoader │ DRACOLoader │      RGBELoader             │
│  模型加载    │  模型压缩    │      HDR 环境               │
└─────────────┴─────────────┴─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                    材质系统                              │
├─────────────┬─────────────┬─────────────────────────────┤
│ Physical    │ Environment │      LightMap               │
│ Material    │ Map 反射     │      烘焙光照               │
└─────────────┴─────────────┴─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                   交互 & 动画                            │
├─────────────┬─────────────┬─────────────────────────────┤
│ Raycaster   │ TweenMax    │   AnimationMixer            │
│ 射线拾取     │ 补间动画     │   模型骨骼动画              │
└─────────────┴─────────────┴─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                   后处理管线                             │
│      RenderPass → FXAAPass → BokehPass                  │
│        渲染         抗锯齿       景深                    │
└─────────────────────────────────────────────────────────┘
```

## 核心实现

### 1. DRACO 压缩加载 GLTF 模型

DRACO 是 Google 开发的 3D 模型压缩算法，可将模型体积压缩 70%~90%。

```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

// 配置 DRACO 解码器
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/static/draco/')  // 解码器 WASM 文件路径

// 关联到 GLTF Loader
const loader = new GLTFLoader()
loader.setDRACOLoader(dracoLoader)

// 加载模型
loader.load('model.glb', (gltf) => {
  gltf.scene.scale.set(0.045, 0.045, 0.045)
  gltf.scene.position.set(0, -11, 0)
  gltf.scene.rotation.set(0, 3.9, 0)
  scene.add(gltf.scene)
}, (xhr) => {
  // 加载进度
  const percent = Math.round(xhr.loaded / xhr.total * 100)
  updateLoadingUI(percent)
})
```

**文件结构**：
```
static/draco/
├── draco_decoder.js
├── draco_decoder.wasm
└── gltf/
    ├── draco_decoder.js
    └── draco_wasm_wrapper.js
```

### 2. HDR 环境贴图实现真实材质

HDR 贴图能提供更真实的环境反射，让金属、玻璃材质更有质感。

```javascript
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'

const hdrLoader = new RGBELoader()
  .setDataType(THREE.UnsignedByteType)
  .setPath('/static/img/')

hdrLoader.load('environment.hdr', (texture) => {
  // 生成环境贴图
  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  const envMap = pmremGenerator.fromEquirectangular(texture)

  // 应用到材质
  glassMaterial.envMap = envMap.texture
  glassMaterial.envMapIntensity = 1

  // 释放资源
  texture.dispose()
  pmremGenerator.dispose()
})
```

### 3. 物理材质实现玻璃效果

```javascript
const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0,          // 金属度
  roughness: 0,          // 粗糙度
  envMap: hdrEnvMap,     // 环境贴图
  envMapIntensity: 1,    // 环境强度
  transparency: 0.8,     // 透明度
  transparent: true,
  depthTest: false,      // 深度测试
  side: THREE.BackSide   // 渲染背面（内部可见）
})
```

**不同材质配置**：

| 材质 | metalness | roughness | transparency |
|------|-----------|-----------|--------------|
| 玻璃 | 0 | 0 | 0.5~0.8 |
| 磨砂玻璃 | 0 | 0.3 | 0.5 |
| 金属 | 1 | 0~0.3 | - |
| 塑料 | 0 | 0.5 | - |

### 4. 射线交互实现热点点击

```javascript
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

function onMouseClick(event) {
  // 计算归一化设备坐标
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

  // 更新射线
  raycaster.setFromCamera(mouse, camera)

  // 检测相交
  const intersects = raycaster.intersectObjects(scene.children, true)

  if (intersects.length > 0) {
    const object = intersects[0].object

    // 根据物体名称触发不同交互
    if (object.name === 'icon-1') {
      switchToScene1()
    } else if (object.name === 'icon-2') {
      switchToScene2()
    }
  }
}

// 同时支持 PC 和移动端
window.addEventListener('click', onMouseClick)
document.addEventListener('touchend', (e) => {
  // 移动端需要从 changedTouches 获取坐标
  const touch = e.changedTouches[0]
  onMouseClick({ clientX: touch.clientX, clientY: touch.clientY })
})
```

### 5. TweenMax 场景切换动画

使用 GSAP (TweenMax) 实现丝滑的场景过渡：

```javascript
function switchToScene(sceneIndex) {
  const positions = [
    { x: -10, y: -5, z: 0 },   // 场景 1
    { x: -5, y: -15, z: 5 },   // 场景 2
    { x: 2, y: -24, z: 10 },   // 场景 3
    { x: -5, y: -32, z: 27 },  // 场景 4
    { x: -7, y: -42, z: 35 }   // 场景 5
  ]

  const target = positions[sceneIndex]

  // 同时移动所有层
  scene.children.forEach((child, index) => {
    if (child.isGroup) {
      TweenMax.to(child.position, 1, {
        x: target.x,
        y: target.y,
        z: target.z,
        ease: Power2.easeInOut
      })
      TweenMax.to(child.scale, 1, {
        x: 0.1, y: 0.1, z: 0.1  // 放大效果
      })
    }
  })

  // 同步切换背景色
  const colors = ['#c9bfff', '#c29c79', '#8bb9b3', '#d0d09d', '#b3c2ff']
  document.body.style.background = colors[sceneIndex]
}
```

### 6. 多模型动画管理

每个场景有独立的动画，需要单独管理：

```javascript
const mixers = []  // 存储所有 AnimationMixer

// 加载场景模型
function loadSceneModel(url, index) {
  loader.load(url, (gltf) => {
    const model = gltf.scene
    scene.add(model)

    // 创建动画混合器
    const mixer = new THREE.AnimationMixer(model)
    const clip = gltf.animations[0]
    const action = mixer.clipAction(clip)

    mixers[index] = { mixer, action }
  })
}

// 动画循环
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)

  const delta = clock.getDelta()

  // 更新所有激活的动画
  mixers.forEach(({ mixer, action }) => {
    if (action.isRunning()) {
      mixer.update(delta)
    }
  })

  renderer.render(scene, camera)
}
```

### 7. 后处理效果链

```javascript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass'

// 创建后处理管线
const composer = new EffectComposer(renderer)

// 1. 渲染通道
const renderPass = new RenderPass(scene, camera)
composer.addPass(renderPass)

// 2. FXAA 抗锯齿（开启 EffectComposer 后原生抗锯齿失效）
const fxaaPass = new ShaderPass(FXAAShader)
const pixelRatio = renderer.getPixelRatio()
fxaaPass.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio)
fxaaPass.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio)
composer.addPass(fxaaPass)

// 3. 景深效果
const bokehPass = new BokehPass(scene, camera, {
  focus: 0,        // 焦点距离
  aperture: 2.5,   // 光圈（影响模糊范围）
  maxblur: 0.01    // 最大模糊程度
})
composer.addPass(bokehPass)

// 渲染循环使用 composer 而非 renderer
function animate() {
  requestAnimationFrame(animate)
  composer.render()
}
```

## 技术亮点

### 1. 多场景模型分离加载

将 5 个场景拆分为独立的 GLB 文件，按需加载动画模型：

```javascript
const sceneModels = [
  'a.glb',  // 场景 1 动画
  'b.glb',  // 场景 2 动画
  'c.glb',  // 场景 3 动画
  'd.glb',  // 场景 4 动画
  'e.glb',  // 场景 5 动画
  '1.glb'   // 主场景（包含所有静态模型）
]
```

**优势**：
- 主模型快速加载，动画模型异步
- 各场景动画独立控制
- 便于后期维护更新

### 2. 视角限制保持等距效果

```javascript
const controls = new OrbitControls(camera, renderer.domElement)

// 缩放限制
controls.minDistance = 20
controls.maxDistance = 50

// 垂直角度限制（防止看到底部）
controls.minPolarAngle = 3 / Math.PI
controls.maxPolarAngle = Math.PI / 2.5

// 水平角度限制（保持正面视角）
controls.minAzimuthAngle = -Math.PI / 8
controls.maxAzimuthAngle = Math.PI / 8
```

### 3. 响应式适配

```javascript
function onWindowResize() {
  // 更新相机
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  // 更新渲染器
  renderer.setSize(window.innerWidth, window.innerHeight)

  // 更新 FXAA
  const pixelRatio = renderer.getPixelRatio()
  fxaaPass.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio)
  fxaaPass.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio)

  // 更新后处理
  composer.setSize(window.innerWidth, window.innerHeight)
}

window.addEventListener('resize', onWindowResize)
```

## 踩坑记录

### 问题 1：EffectComposer 导致抗锯齿失效

**原因**：开启后处理后，WebGLRenderer 的 `antialias` 参数不再生效。

**解决**：手动添加 FXAA Pass。

### 问题 2：透明材质渲染顺序错乱

**解决**：设置 `depthTest: false` 或调整渲染顺序。

### 问题 3：HDR 加载后场景过亮

**解决**：调整 `renderer.toneMappingExposure` 或使用 `ACESFilmicToneMapping`。

```javascript
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.8
```

## 项目价值

### 业务价值
- 为品牌发布会提供沉浸式数字体验
- 打破传统 PPT 展示的局限
- 支持线上线下同步展示

### 技术价值
- 完整的 Three.js 品牌展厅解决方案
- DRACO + HDR + 后处理的最佳实践
- 可复用的多场景动画管理架构

## 写在最后

等距空间风格的 3D 展示，是品牌数字化升级的重要方向。相比传统的全景漫游，它更具艺术感和品牌调性。

这个项目的核心技术点：
1. **DRACO 压缩**：解决大型模型加载问题
2. **HDR 环境**：提升材质真实感
3. **射线交互**：实现热点点击
4. **TweenMax**：丝滑的场景切换
5. **后处理**：景深增强空间层次

掌握这些技术，你就能打造出专业级的 3D 品牌展厅。
