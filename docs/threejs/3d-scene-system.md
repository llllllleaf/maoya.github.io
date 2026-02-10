---
description: Three.js 入门教程，从零搭建完整的 3D 场景展示系统，掌握 Scene、Camera、Renderer 核心概念
---

# 从零搭建3D场景展示系统

本文将带你从零开始，使用 Three.js 搭建一个完整的 3D 场景展示系统。

## 核心概念

Three.js 渲染一个 3D 场景需要三个核心元素：

```
场景(Scene) + 相机(Camera) + 渲染器(Renderer) = 3D画面
```

## 项目结构

```
src/
├── assets/
│   └── js/
│       └── init.js      # 场景初始化核心类
├── pages/
│   └── Index.vue        # 主入口组件
└── App.vue
```

## 核心代码实现

### 1. 创建场景初始化类

封装一个 `InitScene` 类，统一管理所有 Three.js 相关逻辑：

```javascript
class InitScene {
  constructor() {
    // 声明核心变量
    let renderer, camera, scene;
  }

  init(THREE, OrbitControls, GLTFLoader, vue) {
    // 保存引用
    this.vue = vue;
    this.THREE = THREE;

    // 1. 创建场景
    let scene = new THREE.Scene();

    // 2. 创建相机
    let camera = new THREE.PerspectiveCamera(
      45,                                    // 视角
      window.innerWidth / window.innerHeight, // 宽高比
      1,                                      // 近裁剪面
      10000                                   // 远裁剪面
    );
    camera.position.set(0, 10, 30);

    // 3. 创建渲染器
    let renderer = new THREE.WebGLRenderer({
      antialias: true,  // 抗锯齿
      alpha: true       // 透明背景
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // 挂载到 DOM
    document.getElementById("webgl").appendChild(renderer.domElement);
  }
}
```

### 2. 配置相机参数

```javascript
// 透视相机参数详解
let camera = new THREE.PerspectiveCamera(
  45,   // FOV: 视野角度，越大看到的范围越广
  window.innerWidth / window.innerHeight,  // Aspect: 宽高比
  1,    // Near: 近裁剪面，小于此距离不渲染
  10000 // Far: 远裁剪面，大于此距离不渲染
);

// 设置相机位置
camera.position.z = 30;  // 距离场景中心 30 单位
camera.position.y = 10;  // 高度 10 单位
camera.position.x = 0;   // 水平居中
```

### 3. 配置渲染器

```javascript
let renderer = new THREE.WebGLRenderer({
  antialias: true,  // 开启抗锯齿
  alpha: true       // 支持透明背景
});

// 设置渲染尺寸
renderer.setSize(window.innerWidth, window.innerHeight);

// 高清屏适配：使用设备像素比
renderer.setPixelRatio(window.devicePixelRatio);

// 开启阴影
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;  // 柔和阴影

// 伽马校正（色彩更准确）
renderer.gammaOutput = true;
renderer.gammaFactor = 2.2;
```

### 4. 添加轨道控制器

轨道控制器让用户可以通过鼠标/触摸来旋转、缩放、平移场景：

```javascript
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 创建控制器
var controls = new OrbitControls(camera, renderer.domElement);

// 启用缩放和平移
controls.enableZoom = true;
controls.enablePan = true;

// 限制缩放距离
controls.minDistance = 20;  // 最近
controls.maxDistance = 50;  // 最远

// 限制垂直旋转角度（防止翻转到底部）
controls.minPolarAngle = 3 / Math.PI;
controls.maxPolarAngle = Math.PI / 2.5;

// 限制水平旋转角度
controls.minAzimuthAngle = -Math.PI / 8;
controls.maxAzimuthAngle = Math.PI / 8;
```

### 5. 添加光源

```javascript
// 环境光：均匀照亮所有物体
let ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

// 平行光：模拟太阳光，有方向
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
directionalLight.position.set(-6, 20, 6);
scene.add(directionalLight);
```

### 6. 响应式布局

监听窗口变化，自动调整渲染尺寸：

```javascript
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
```

### 7. 渲染循环

```javascript
function animate() {
  requestAnimationFrame(animate);

  // 更新控制器
  controls.update();

  // 渲染场景
  renderer.render(scene, camera);
}

animate();
```

## Vue 组件集成

```vue
<template>
  <div class="main">
    <div id="webgl"></div>
  </div>
</template>

<script>
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import InitScene from "../assets/js/init.js";

export default {
  mounted() {
    // 初始化场景
    let Init = new InitScene();
    Init.init(THREE, OrbitControls, this);
  }
}
</script>

<style>
#webgl {
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
}
</style>
```

## 完整流程图

```
1. 创建场景 Scene
       ↓
2. 创建相机 Camera（设置位置、视角）
       ↓
3. 创建渲染器 Renderer（设置尺寸、像素比）
       ↓
4. 添加控制器 OrbitControls
       ↓
5. 添加光源（环境光 + 平行光）
       ↓
6. 监听窗口变化
       ↓
7. 启动渲染循环
```

