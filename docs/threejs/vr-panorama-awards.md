---
description: Three.js 立方体全景 VR 展厅实战，实现热点交互、场景切换和平滑过渡的 360° 漫游系统
---

# Three.js 实战：立方体全景 VR 展厅与热点漫游系统

> 如何用 Three.js 打造一个支持热点交互、场景切换、平滑过渡的 360° 全景 VR 展厅？本文以「中源协和生命医学奖五周年纪念馆」项目为例，详解立方体全景的完整实现。

## 为什么选择立方体全景？

360° 全景有两种主流实现方式：

| 方案 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| 球体全景 | 等距柱状投影贴图贴到球体内部 | 贴图制作简单（一张图） | 极点畸变明显 |
| 立方体全景 | 6 张正方形贴图贴到立方体 6 个面 | 无畸变、清晰度高 | 需要切割 6 张图 |

本项目采用**立方体全景**，适合高质量展厅场景。

## 项目成果

<div class="video-container">
  <video controls>
    <source src="/videos/医学奖五周年馆.mp4" type="video/mp4">
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
- 6 个全景场景自由切换
- 可点击热点触发场景跳转 / 弹窗
- 场景切换淡入淡出过渡动画
- 支持鼠标拖拽 + 触屏滑动
- 热点呼吸动画效果
- 背景音乐 + 加载进度条
- 丰富的弹窗内容（介绍、大事记、评审委员会、获奖者）

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                     用户交互                             │
│         鼠标拖拽 | 触屏滑动 | 热点点击                     │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                  Three.js 全景系统                       │
├─────────────┬─────────────┬─────────────────────────────┤
│ CubeGeometry│ Sprite 热点  │      Raycaster             │
│ 立方体全景   │ 可点击标记   │      射线拾取               │
└─────────────┴─────────────┴─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                   相机控制系统                           │
│      经纬度映射 → 球面坐标 → camera.lookAt               │
└─────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                   场景切换动画                           │
│      TweenMax: 贴图透明度过渡 + 视角平滑转换             │
└─────────────────────────────────────────────────────────┘
```

## 核心实现

### 1. 立方体全景加载

立方体全景使用一张长条拼接图（6 张正方形横向拼接），通过 Canvas 切割成 6 面贴图。

```javascript
// 从长条图切割 6 张贴图
getTexturesFromAtlasFile(atlasImgUrl, tilesNum) {
  let textures = []
  for (let i = 0; i < tilesNum; i++) {
    textures[i] = new THREE.Texture()
  }

  let imageObj = new Image()
  imageObj.onload = () => {
    let tileWidth = imageObj.height  // 每张贴图宽度 = 图片高度
    for (let j = 0; j < textures.length; j++) {
      // 创建 Canvas 切割
      let canvas = document.createElement('canvas')
      let context = canvas.getContext('2d')
      canvas.height = tileWidth
      canvas.width = tileWidth

      // 从长条图中截取第 j 张
      context.drawImage(
        imageObj,
        tileWidth * j, 0,     // 源起点
        tileWidth, tileWidth, // 源尺寸
        0, 0,                 // 目标起点
        tileWidth, tileWidth  // 目标尺寸
      )

      textures[j].image = canvas
      textures[j].needsUpdate = true
    }
  }
  imageObj.src = atlasImgUrl
  return textures
}
```

**贴图格式**：
```
┌──────┬──────┬──────┬──────┬──────┬──────┐
│ 右   │ 左   │ 上   │ 下   │ 前   │ 后   │
│ +X   │ -X   │ +Y   │ -Y   │ +Z   │ -Z   │
└──────┴──────┴──────┴──────┴──────┴──────┘
        ↑ 长条图：6 × 高度 宽度
```

### 2. 创建立方体全景场景

```javascript
// 获取 6 面贴图
let textures = this.getTexturesFromAtlasFile(panoramaUrl, 6)

// 创建 6 个材质
this.materials = []
for (let i = 0; i < 6; i++) {
  this.materials.push(new THREE.MeshBasicMaterial({
    map: textures[i],
    transparent: true,  // 开启透明（用于过渡动画）
    opacity: 1
  }))
}

// 创建立方体并贴图
this.skyBox = new THREE.Mesh(
  new THREE.CubeGeometry(1, 1, 1),
  this.materials
)

// 关键：翻转 Z 轴，让贴图显示在内部
this.skyBox.geometry.scale(3, 3, -3)

scene.add(this.skyBox)
```

**注意**：`scale(3, 3, -3)` 中 Z 轴为负值，这样贴图会显示在立方体内侧，相机在立方体中心就能看到全景。

### 3. 经纬度相机控制

全景漫游的核心是将鼠标拖拽距离转换为相机视角。

```javascript
class InitScene {
  constructor() {
    this.lon = 240  // 经度（水平角度）
    this.lat = 0    // 纬度（垂直角度）
  }

  // 更新相机朝向
  updateCamera() {
    // 限制纬度范围，防止翻转
    this.lat = Math.max(-85, Math.min(85, this.lat))

    // 经纬度 → 球面坐标
    let phi = THREE.Math.degToRad(90 - this.lat)   // 极角
    let theta = THREE.Math.degToRad(this.lon)       // 方位角

    // 球面坐标 → 笛卡尔坐标（相机目标点）
    this.camera.target.x = Math.sin(phi) * Math.cos(theta)
    this.camera.target.y = Math.cos(phi)
    this.camera.target.z = Math.sin(phi) * Math.sin(theta)

    // 相机看向目标点
    this.camera.lookAt(this.camera.target)
    this.camera.updateProjectionMatrix()
  }
}
```

**数学原理**：

```
        Y (上)
        │
        │  ·P (目标点)
        │ /│
        │/ │ lat (纬度)
        ───┼───── X
       /   │
      /    │
     Z (前) lon (经度)

P.x = sin(phi) * cos(theta)
P.y = cos(phi)
P.z = sin(phi) * sin(theta)
```

### 4. 鼠标/触屏拖拽控制

```javascript
let isUserInteracting = false
let onMouseDownLon, onMouseDownLat
let onMouseDownMouseX, onMouseDownMouseY

// 按下
function onMouseDown(event) {
  isUserInteracting = true

  let touch = event.touches ? event.touches[0] : event
  onMouseDownMouseX = touch.clientX
  onMouseDownMouseY = touch.clientY
  onMouseDownLon = this.lon
  onMouseDownLat = this.lat
}

// 移动
function onMouseMove(event) {
  if (!isUserInteracting) return

  let touch = event.touches ? event.touches[0] : event

  // 拖拽距离 → 经纬度变化
  this.lon = (onMouseDownMouseX - touch.clientX) * 0.2 + onMouseDownLon
  this.lat = (touch.clientY - onMouseDownMouseY) * 0.2 + onMouseDownLat
}

// 抬起
function onMouseUp() {
  isUserInteracting = false
}

// 同时绑定鼠标和触屏事件
container.addEventListener('mousedown', onMouseDown)
container.addEventListener('touchstart', onMouseDown)
container.addEventListener('mousemove', onMouseMove)
container.addEventListener('touchmove', onMouseMove)
container.addEventListener('mouseup', onMouseUp)
container.addEventListener('touchend', onMouseUp)
```

### 5. Sprite 热点系统

热点使用 `THREE.Sprite`，它永远面向相机，适合做 2D 标记。

```javascript
createClickTag(data) {
  for (let i = 0; i < data.length; i++) {
    if (data[i].type === 'Sprite') {
      // 加载热点图片
      let texture = THREE.ImageUtils.loadTexture(data[i].hot_img)
      let material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 1
      })

      // 创建精灵
      let hotspot = new THREE.Sprite(material)
      hotspot.position.set(data[i].x, data[i].y, data[i].z)
      hotspot.scale.set(0.8, 0.8, 0.8)
      hotspot.name = data[i].id
      hotspot.visible = data[i].visible

      // 呼吸动画
      TweenMax.to(hotspot.scale, 1, {
        x: 1, y: 1, z: 1,
        repeat: -1,    // 无限循环
        yoyo: true     // 来回播放
      })

      this.scene.add(hotspot)
    }
  }
}
```

**热点数据结构**：

```javascript
const hotspots = [
  {
    id: 'intro',
    type: 'Sprite',
    hot_img: '/images/hotspot.png',
    x: 0.5, y: 0, z: -0.8,
    visible: true,
    fun: true,  // 是否触发场景切换
    panoram_img: '/images/scene2.jpg',  // 目标场景
    lon: 180, lat: 0,  // 切换后的视角
    display_id: ['hotspot2', 'hotspot3'],  // 显示的热点
    clickFn: () => { /* 回调 */ }
  }
]
```

### 6. 射线拾取实现点击检测

```javascript
let raycaster = new THREE.Raycaster()
let mouse = new THREE.Vector2()

function onMouseUp(event) {
  // 计算归一化坐标
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

  // 设置射线
  raycaster.setFromCamera(mouse, camera)

  // 检测相交（排除立方体本身，从第 1 个开始）
  let intersects = raycaster.intersectObjects(scene.children)

  if (intersects.length >= 2) {
    let clickedObject = intersects[1].object  // [0] 是立方体

    // 根据热点名称执行对应操作
    hotspots.forEach(hotspot => {
      if (hotspot.id === clickedObject.name) {
        if (hotspot.fun) {
          switchScene(hotspot)  // 切换场景
        } else {
          hotspot.clickFn()     // 执行回调（如打开弹窗）
        }
      }
    })
  }
}
```

### 7. 场景切换过渡动画

场景切换时，旧场景淡出、新场景淡入，实现平滑过渡。

```javascript
function switchScene(hotspot) {
  // 1. 旧场景淡出
  for (let i = 0; i < 6; i++) {
    TweenMax.to(this.materials[i], 1, {
      opacity: 0,
      ease: Linear.easeInOut
    })
  }

  // 2. 加载新场景贴图
  let newTextures = this.getTexturesFromAtlasFile(hotspot.panoram_img, 6)
  this.materials = []

  for (let i = 0; i < 6; i++) {
    this.materials.push(new THREE.MeshBasicMaterial({
      map: newTextures[i],
      transparent: true,
      opacity: 0  // 初始透明
    }))

    // 新场景淡入
    TweenMax.to(this.materials[i], 1, {
      opacity: 1,
      ease: Linear.easeInOut
    })
  }

  // 3. 更新热点可见性
  scene.children.forEach(child => {
    if (child.type === 'Sprite') {
      child.visible = hotspot.display_id.includes(child.name)
    }
  })

  // 4. 切换视角
  this.lon = hotspot.lon
  this.lat = hotspot.lat
}
```

## 技术亮点

### 1. 基于 Canvas 的贴图切割

无需预先切割 6 张图片，前端动态切割，便于维护。

### 2. 经纬度相机控制

将复杂的 3D 旋转简化为直观的经纬度操作，代码清晰易懂。

### 3. 热点呼吸动画

```javascript
TweenMax.to(hotspot.scale, 1, {
  x: 1, y: 1, z: 1,
  repeat: -1,
  yoyo: true
})
```

简单几行代码实现持续的缩放动画，增强交互提示。

### 4. 场景切换淡入淡出

通过材质透明度过渡，避免生硬的切换。

## 踩坑记录

### 问题 1：立方体贴图方向错误

**解决**：`scale(x, y, -z)` 翻转 Z 轴，让贴图显示在内部。

### 问题 2：触屏滑动页面跟着滚动

**解决**：在 `touchmove` 中调用 `event.preventDefault()`。

### 问题 3：热点点击穿透立方体

**解决**：射线检测结果中，`[0]` 是立方体，`[1]` 才是热点。

## 项目价值

### 业务价值
- 为医学奖五周年提供线上 VR 纪念展厅
- 展示奖项历史、评审委员会、历届获奖者
- 打破时空限制，永久保存里程碑

### 技术价值
- 完整的立方体全景解决方案
- 可复用的热点系统
- 场景切换动画最佳实践

## 写在最后

立方体全景相比球体全景，虽然贴图制作稍复杂，但清晰度更高、无极点畸变，更适合高质量展厅场景。

这个项目的核心要点：
1. **Canvas 切割**：动态生成 6 面贴图
2. **经纬度控制**：直观的相机操作
3. **Sprite 热点**：永远面向相机的 2D 标记
4. **射线拾取**：3D 空间点击检测
5. **透明度过渡**：平滑的场景切换

掌握这些技术，你就能打造专业级的 VR 全景漫游系统。
