# Three.js 实战：第一人称 3D 展厅漫游系统

> 如何用 Three.js 构建一个支持第一人称漫游、移动端虚拟摇杆、碰撞检测的 3D 展厅系统？本文以「中源协和生命医学奖」3D 展厅项目为例，详解完整实现。

## 为什么需要第一人称漫游？

传统的轨道控制器（OrbitControls）适合展示单个物体，但对于展厅、室内场景，第一人称视角更能带来沉浸感。

| 控制方式 | 特点 | 适用场景 |
|----------|------|----------|
| OrbitControls | 绕中心点旋转 | 产品展示 |
| FirstPersonControls | 相机位置固定 | 全景漫游 |
| 自定义 FPS 控制 | 自由移动 + 视角 | 3D 展厅 |

本项目采用**自定义 FPS 控制器**，实现 WASD 键盘移动 + 鼠标视角 + 触屏摇杆的完整方案。

## 项目成果

<div class="video-container">
  <video controls muted>
    <source src="/videos/3d-first-person-awards.mp4" type="video/mp4">
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
- GLTF 模型加载与展示
- PC 端鼠标右键拖拽旋转视角
- WASD / 方向键控制移动
- 移动端虚拟摇杆控制
- 射线碰撞检测防止穿墙
- 多光源系统实现真实光影
- 柔和阴影增强立体感

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                      用户交互层                          │
├──────────────┬──────────────┬───────────────────────────┤
│   PC 键鼠     │   触屏摇杆    │       视角控制            │
│   WASD移动    │  MovementPad │     RotationPad          │
└──────┬───────┴──────┬───────┴───────────┬───────────────┘
       │              │                   │
       ▼              ▼                   ▼
┌──────────────────────────────────────────────────────────┐
│                   TouchControls 控制器                    │
│     统一处理 PC/移动端输入 → 更新相机位置和朝向            │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│                    碰撞检测系统                           │
│      Raycaster 四方向射线 → 检测障碍物 → 锁定移动         │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│                   Three.js 渲染核心                       │
├─────────────┬─────────────┬──────────────────────────────┤
│  GLTFLoader │  光源系统    │       阴影渲染               │
│  模型加载    │  环境+聚光   │       PCFSoftShadowMap      │
└─────────────┴─────────────┴──────────────────────────────┘
```

## 核心实现

### 1. 场景与渲染器初始化

```javascript
// 创建场景
let scene = new THREE.Scene()
scene.background = new THREE.Color(0xcce0ff)

// 创建相机
let camera = new THREE.PerspectiveCamera(
  45,                                      // 视野角度
  window.innerWidth / window.innerHeight,  // 宽高比
  1,                                       // 近裁剪面
  10000                                    // 远裁剪面
)
camera.position.set(0, 0, 500)

// 创建渲染器
renderer = new THREE.WebGLRenderer({
  antialias: true,  // 抗锯齿
  alpha: true       // 透明背景
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)

// 开启阴影
renderer.shadowMapEnabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap  // 柔和阴影
```

### 2. 多光源系统配置

真实的光影效果需要多种光源配合：

```javascript
// 1. 环境光：提供基础照明
let ambientLight = new THREE.AmbientLight(0xffffff)
ambientLight.position.set(0, 0, 20)
scene.add(ambientLight)

// 2. 半球光：模拟天空和地面的反射
var hemiLight = new THREE.HemisphereLight(
  0xffffff,  // 天空颜色
  0xffffff,  // 地面颜色
  0.3        // 强度
)
hemiLight.position.set(0, 0, 0)
scene.add(hemiLight)

// 3. 聚光灯：产生聚焦光束和阴影
let spotLight = new THREE.SpotLight(0x333333)
spotLight.position.set(0, 0, 10)
spotLight.castShadow = true
spotLight.intensity = 1
spotLight.shadow.mapSize.width = 10000   // 阴影贴图分辨率
spotLight.shadow.mapSize.height = 10000
spotLight.shadow.camera.near = 50
spotLight.shadow.camera.far = 5000
```

**光源类型对比**：

| 光源类型 | 特点 | 适用场景 |
|----------|------|----------|
| AmbientLight | 均匀照亮所有物体 | 基础照明 |
| HemisphereLight | 模拟天空光照 | 室外场景 |
| SpotLight | 聚焦光束，产生阴影 | 聚光效果 |
| DirectionalLight | 平行光，模拟太阳 | 室外阳光 |

### 3. GLTF 模型加载

```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

let loader = new GLTFLoader()

loader.load(
  'model.gltf',
  (gltf) => {
    // 设置模型缩放和位置
    gltf.scene.scale.set(1, 1, 1)
    gltf.scene.position.set(0, 0, 0)

    // 遍历模型，开启阴影
    gltf.scene.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true     // 投射阴影
        o.receiveShadow = true  // 接收阴影
      }
    })

    scene.add(gltf.scene)
  },
  undefined,
  (error) => {
    console.error('模型加载失败:', error)
  }
)
```

### 4. FPS 相机封装

核心思想：将相机包裹在 Object3D 中，分离位置控制和视角控制。

```javascript
class TouchControls {
  constructor(container, camera, options, THREE) {
    // 相机持有者（控制俯仰角）
    var cameraHolder = new THREE.Object3D()
    cameraHolder.name = "cameraHolder"
    cameraHolder.add(camera)

    // FPS 身体（控制位置和水平旋转）
    this.fpsBody = new THREE.Object3D()
    this.fpsBody.add(cameraHolder)

    // 速度向量
    this.velocity = new THREE.Vector3(0, 0, 0)

    // 配置参数
    this.config = {
      speedFactor: 0.5,      // 移动速度
      rotationFactor: 0.002, // 旋转灵敏度
      maxPitch: 55,          // 最大俯仰角
      hitTestDistance: 40    // 碰撞检测距离
    }
  }
}
```

**FPS 相机结构**：

```
fpsBody (控制位置 + 水平旋转 rotation.y)
  └── cameraHolder (控制俯仰角 rotation.x)
        └── camera (实际相机)
```

### 5. 键盘控制实现

```javascript
// 移动状态标记
var moveForward = false
var moveBackward = false
var moveLeft = false
var moveRight = false

document.addEventListener("keydown", (e) => {
  switch (e.keyCode) {
    case 38: case 87: moveForward = true; break   // ↑ / W
    case 40: case 83: moveBackward = true; break  // ↓ / S
    case 37: case 65: moveLeft = true; break      // ← / A
    case 39: case 68: moveRight = true; break     // → / D
  }
})

document.addEventListener("keyup", (e) => {
  switch (e.keyCode) {
    case 38: case 87: moveForward = false; break
    case 40: case 83: moveBackward = false; break
    case 37: case 65: moveLeft = false; break
    case 39: case 68: moveRight = false; break
  }
})
```

### 6. 移动更新逻辑

```javascript
update() {
  // 阻尼效果（速度逐渐衰减）
  this.velocity.x += (-1 * this.velocity.x) * 0.75 * delta
  this.velocity.z += (-1 * this.velocity.z) * 0.75 * delta

  // 根据移动状态更新速度
  if (moveForward && !lockMoveForward) {
    this.velocity.z -= speedFactor * delta
  }
  if (moveBackward && !lockMoveBackward) {
    this.velocity.z += speedFactor * delta
  }
  if (moveLeft && !lockMoveLeft) {
    this.velocity.x -= speedFactor * delta
  }
  if (moveRight && !lockMoveRight) {
    this.velocity.x += speedFactor * delta
  }

  // 相对自身坐标系移动
  this.fpsBody.translateX(this.velocity.x)
  this.fpsBody.translateZ(this.velocity.z)
}
```

### 7. 移动端虚拟摇杆

```javascript
class MovementPad {
  constructor(container) {
    // 创建摇杆 DOM 结构
    this.movementPad = $('<div class="movement-pad"></div>')
    this.region = $('<div class="region"></div>')  // 底座圆盘
    this.handle = $('<div class="handle"></div>')  // 可拖动摇杆

    // 计算摇杆中心和半径
    this.regionData = {
      radius: this.region.outerWidth() / 2,
      centerX: /* 中心 X 坐标 */,
      centerY: /* 中心 Y 坐标 */
    }

    // 触摸事件监听
    this.region.on("touchstart", (e) => {
      this.handle.css("opacity", "1.0")
      this.update(e.originalEvent.touches[0].pageX,
                  e.originalEvent.touches[0].pageY)
    })

    $(document).on("touchmove", (e) => {
      this.update(e.originalEvent.touches[0].pageX,
                  e.originalEvent.touches[0].pageY)
    })
  }

  update(pageX, pageY) {
    // 计算触摸点相对于中心的偏移
    let newLeft = pageX - this.regionData.offset.left
    let newTop = pageY - this.regionData.offset.top

    // 限制在圆形区域内
    let distance = Math.pow(centerX - newLeft, 2) +
                   Math.pow(centerY - newTop, 2)
    if (distance > Math.pow(radius, 2)) {
      let angle = Math.atan2(newTop - centerY, newLeft - centerX)
      newLeft = Math.cos(angle) * radius + centerX
      newTop = Math.sin(angle) * radius + centerY
    }

    // 更新摇杆位置
    this.handle.css({ top: newTop, left: newLeft })

    // 归一化为 -2 到 2 的范围，触发移动事件
    let deltaX = /* 归一化计算 */
    let deltaY = /* 归一化计算 */
    $(this).trigger('move', { deltaX, deltaY })
  }
}
```

### 8. 射线碰撞检测

向四个方向发射射线，检测障碍物并锁定对应方向：

```javascript
hitTest() {
  // 解锁所有方向
  this.unlockAllDirections()

  // 获取相机当前朝向
  var cameraDirection = this.getDirection().clone()

  // 四个方向的旋转矩阵
  var rotationMatrices = [
    new THREE.Matrix4().makeRotationY(0),             // 前
    new THREE.Matrix4().makeRotationY(Math.PI),       // 后
    new THREE.Matrix4().makeRotationY(Math.PI / 2),   // 左
    new THREE.Matrix4().makeRotationY(-Math.PI / 2)   // 右
  ]

  for (let i = 0; i < 4; i++) {
    // 计算该方向的向量
    let direction = cameraDirection.clone()
    direction.applyMatrix4(rotationMatrices[i])

    // 创建射线
    let rayCaster = new THREE.Raycaster(
      this.fpsBody.position,  // 起点：玩家位置
      direction               // 方向
    )

    // 检测与场景物体的相交
    let intersects = rayCaster.intersectObject(scene, true)

    // 如果距离小于阈值，锁定该方向的移动
    if (intersects.length > 0 && intersects[0].distance < 40) {
      this.lockDirectionByIndex(i)
    }
  }
}
```

**碰撞检测原理**：

```
          前 (0)
           ↑
           │  射线长度 40
     ┌─────┼─────┐
左 ←─┤  玩家  ├─→ 右
(2)  └─────┼─────┘  (3)
           │
           ↓
          后 (1)

射线碰到物体 && 距离 < 40 → 锁定该方向移动
```

### 9. 视角旋转控制

```javascript
// 计算相机旋转（鼠标/触摸偏移 → 欧拉角）
function calculateCameraRotation(dx, dy) {
  var factor = this.config.rotationFactor  // 灵敏度
  var maxPitch = this.config.maxPitch * Math.PI / 180

  // 水平旋转：控制 fpsBody 的 Y 轴旋转
  var ry = this.fpsBody.rotation.y - (dx * factor)

  // 垂直旋转：控制 cameraHolder 的 X 轴旋转（限制范围）
  var rx = cameraHolder.rotation.x - (dy * factor)
  rx = Math.max(-maxPitch, Math.min(maxPitch, rx))

  return { rx, ry }
}

// 应用旋转
setRotation(x, y) {
  var camHolder = this.fpsBody.getObjectByName("cameraHolder")
  if (x !== null) camHolder.rotation.x = x
  if (y !== null) this.fpsBody.rotation.y = y
}
```

### 10. 点击交互

```javascript
var raycaster = new THREE.Raycaster()

function raycast(event, touch = false) {
  var mouse = {}

  // 归一化坐标
  if (touch) {
    mouse.x = 2 * (event.changedTouches[0].clientX / window.innerWidth) - 1
    mouse.y = 1 - 2 * (event.changedTouches[0].clientY / window.innerHeight)
  } else {
    mouse.x = 2 * (event.clientX / window.innerWidth) - 1
    mouse.y = 1 - 2 * (event.clientY / window.innerHeight)
  }

  raycaster.setFromCamera(mouse, camera)
  var intersects = raycaster.intersectObjects(scene.children, true)

  if (intersects[0]) {
    console.log('点击了:', intersects[0].object.name)
    // 执行对应交互
  }
}

window.addEventListener('click', e => raycast(e))
window.addEventListener('touchend', e => raycast(e, true))
```

## 技术亮点

### 1. 分离式 FPS 相机

将位置、水平旋转、俯仰角分别控制，代码清晰：

```javascript
fpsBody.position        // 位置
fpsBody.rotation.y      // 水平旋转（左右看）
cameraHolder.rotation.x // 俯仰角（上下看）
```

### 2. 四方向碰撞检测

不依赖物理引擎，用四条射线实现简易碰撞，轻量高效。

### 3. 统一输入抽象

TouchControls 统一处理键盘、鼠标、触屏，一套代码多端适配。

### 4. 阻尼移动效果

速度逐渐衰减，而非立即停止，手感更自然：

```javascript
velocity.x += (-1 * velocity.x) * 0.75 * delta
```

## 踩坑记录

### 问题 1：阴影不显示

**解决**：需要同时满足三个条件：

```javascript
renderer.shadowMapEnabled = true     // 1. 渲染器开启
spotLight.castShadow = true          // 2. 光源开启
mesh.castShadow = mesh.receiveShadow = true  // 3. 模型开启
```

### 问题 2：移动端摇杆滑动页面跟着动

**解决**：阻止默认事件

```javascript
region.on("touchmove", (e) => {
  e.preventDefault()
})
```

### 问题 3：碰撞检测穿墙

**原因**：帧率低时单帧移动距离超过检测范围。

**解决**：增大检测距离或使用固定时间步长。

## 项目价值

### 业务价值
- 为医学奖颁奖典礼提供线上 3D 展厅
- 突破线下场地限制，扩大活动影响力
- 增强品牌科技形象

### 技术价值
- 完整的第一人称漫游解决方案
- 可复用的触摸控制器组件
- 简易碰撞检测参考实现

## 写在最后

第一人称 3D 漫游是 Web 3D 开发的常见需求。本项目核心技术点：

1. **FPS 相机封装**：Object3D 嵌套分离控制
2. **虚拟摇杆**：移动端友好的交互
3. **射线碰撞**：轻量级防穿墙方案
4. **多光源系统**：真实光影效果
5. **统一输入**：多端适配

掌握这些技术，你就能快速搭建各种 3D 场景漫游系统。
