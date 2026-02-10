---
description: Three.js 中 GLTF 模型加载与 DRACO 压缩优化详解，大幅减少 3D 模型文件体积
---

# GLTF模型加载与DRACO压缩优化

GLTF 是 WebGL 领域的「JPEG」，是目前最主流的 3D 模型格式。本文介绍如何加载 GLTF 模型，并使用 DRACO 压缩大幅减少文件体积。

## GLTF 格式简介

| 格式 | 特点 |
|------|------|
| `.gltf` | JSON 格式，可读性好，资源分离 |
| `.glb` | 二进制格式，单文件，体积更小 |

## 基础模型加载

### 1. 引入 GLTFLoader

```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const loader = new GLTFLoader();

loader.load(
  '/models/scene.glb',    // 模型路径
  (gltf) => {             // 加载成功回调
    scene.add(gltf.scene);
  },
  (progress) => {         // 加载进度回调
    console.log((progress.loaded / progress.total * 100) + '% loaded');
  },
  (error) => {            // 加载失败回调
    console.error('模型加载失败', error);
  }
);
```

### 2. 调整模型位置和缩放

```javascript
loader.load('/models/scene.glb', (gltf) => {
  const model = gltf.scene;

  // 设置缩放
  model.scale.set(0.045, 0.045, 0.045);

  // 设置位置
  model.position.set(0, -11, 0);

  // 设置旋转
  model.rotation.y = Math.PI / 4;

  scene.add(model);
});
```

## DRACO 压缩

DRACO 是 Google 开发的 3D 几何压缩库，可以将模型体积压缩到原来的 **10%-20%**。

### 压缩效果对比

| 模型 | 原始大小 | DRACO压缩后 | 压缩率 |
|------|---------|------------|--------|
| 场景模型 | 50MB | 8MB | 84% |
| 角色模型 | 20MB | 3MB | 85% |

### 1. 引入 DRACOLoader

```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

// 创建 DRACO 解码器
const dracoLoader = new DRACOLoader();

// 设置解码器路径（需要放置解码器文件）
dracoLoader.setDecoderPath('/draco/');

// 配置 GLTFLoader 使用 DRACO
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
```

### 2. 解码器文件

需要将 DRACO 解码器文件放到 `public/draco/` 目录：

```
public/
└── draco/
    ├── draco_decoder.js
    ├── draco_decoder.wasm
    ├── draco_wasm_wrapper.js
    └── draco_encoder.js
```

这些文件可以从 `three/examples/js/libs/draco/` 复制。

### 3. 完整加载代码

```javascript
// 创建加载器
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
dracoLoader.preload();  // 预加载解码器

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

// 加载压缩模型
loader.load('/models/scene-draco.glb', (gltf) => {
  scene.add(gltf.scene);

  // 释放解码器资源
  dracoLoader.dispose();
});
```

## 加载进度条

```javascript
// 创建加载管理器
const manager = new THREE.LoadingManager();

manager.onProgress = (url, loaded, total) => {
  const progress = (loaded / total * 100).toFixed(0);
  document.querySelector('.loading-time').textContent = progress + '%';
  document.querySelector('.line-x').style.width = progress + '%';
};

manager.onLoad = () => {
  // 隐藏加载界面
  document.querySelector('.loading').style.display = 'none';
};

// 使用管理器创建加载器
const loader = new GLTFLoader(manager);
```

## 模型遍历与材质处理

加载后可以遍历模型，修改材质：

```javascript
loader.load('/models/scene.glb', (gltf) => {
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      // 开启阴影
      child.castShadow = true;
      child.receiveShadow = true;

      // 修改材质
      if (child.name === 'glass') {
        child.material.transparent = true;
        child.material.opacity = 0.5;
      }
    }
  });

  scene.add(gltf.scene);
});
```

## 模型动画

GLTF 可以包含骨骼动画：

```javascript
let mixer;

loader.load('/models/character.glb', (gltf) => {
  scene.add(gltf.scene);

  // 创建动画混合器
  mixer = new THREE.AnimationMixer(gltf.scene);

  // 播放第一个动画
  const action = mixer.clipAction(gltf.animations[0]);
  action.play();
});

// 在渲染循环中更新动画
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  renderer.render(scene, camera);
}
```

## 性能优化建议

1. **使用 DRACO 压缩** - 减少 80%+ 文件体积
2. **合并网格** - 减少 Draw Call
3. **使用 LOD** - 远距离显示低精度模型
4. **延迟加载** - 先加载关键模型
5. **纹理压缩** - 使用 KTX2/Basis 格式

