---
description: Three.js 后处理效果教程，详解 FXAA 抗锯齿和景深（DOF）的实现原理与代码实践
---

# 后处理效果：FXAA与景深实现

后处理是在渲染完成后，对整个画面进行图像处理。本文介绍如何实现 FXAA 抗锯齿和景深效果。

## 后处理原理

```
场景渲染 → 渲染到纹理 → 着色器处理 → 输出到屏幕
```

Three.js 通过 `EffectComposer` 管理后处理流程。

## 基础设置

### 1. 引入依赖

```javascript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
```

### 2. 创建 EffectComposer

```javascript
// 创建效果合成器
const composer = new EffectComposer(renderer);

// 添加渲染通道（必须第一个添加）
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
```

### 3. 修改渲染循环

```javascript
function animate() {
  requestAnimationFrame(animate);

  // 使用 composer 代替 renderer
  composer.render();
}
```

## FXAA 抗锯齿

FXAA（Fast Approximate Anti-Aliasing）是一种快速的后处理抗锯齿算法。

```javascript
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// 创建 FXAA 通道
const fxaaPass = new ShaderPass(FXAAShader);

// 设置分辨率
const pixelRatio = renderer.getPixelRatio();
fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);

composer.addPass(fxaaPass);
```

### 响应窗口变化

```javascript
function onWindowResize() {
  const pixelRatio = renderer.getPixelRatio();

  fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
  fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);

  composer.setSize(window.innerWidth, window.innerHeight);
}
```

## 景深效果 (Bokeh)

景深效果让画面有「焦点」感，焦点外的物体会模糊。

```javascript
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

const bokehPass = new BokehPass(scene, camera, {
  focus: 50,       // 焦点距离
  aperture: 0.002, // 光圈大小，越大模糊越强
  maxblur: 0.01    // 最大模糊程度
});

composer.addPass(bokehPass);
```

### 景深参数说明

| 参数 | 说明 | 推荐值 |
|------|------|--------|
| `focus` | 焦点距离（单位与场景一致） | 根据场景调整 |
| `aperture` | 光圈，控制模糊强度 | 0.001 - 0.01 |
| `maxblur` | 最大模糊程度 | 0.005 - 0.02 |

## HDR 环境贴图

HDR 环境贴图可以提供真实的环境光照和反射：

```javascript
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const rgbeLoader = new RGBELoader();

rgbeLoader.load('/textures/environment.hdr', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;

  // 设置场景背景
  scene.background = texture;

  // 设置环境贴图（影响所有 PBR 材质）
  scene.environment = texture;
});
```

### 环境贴图用于反射

```javascript
loader.load('/models/car.glb', (gltf) => {
  gltf.scene.traverse((child) => {
    if (child.isMesh && child.material.isMeshStandardMaterial) {
      // 设置环境贴图强度
      child.material.envMapIntensity = 1.5;
    }
  });
});
```

## 完整后处理配置

```javascript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

function setupPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);

  // 1. 基础渲染
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 2. 景深效果
  const bokehPass = new BokehPass(scene, camera, {
    focus: 50,
    aperture: 0.002,
    maxblur: 0.01
  });
  composer.addPass(bokehPass);

  // 3. FXAA 抗锯齿（放最后）
  const fxaaPass = new ShaderPass(FXAAShader);
  const pixelRatio = renderer.getPixelRatio();
  fxaaPass.material.uniforms['resolution'].value.set(
    1 / (window.innerWidth * pixelRatio),
    1 / (window.innerHeight * pixelRatio)
  );
  composer.addPass(fxaaPass);

  return composer;
}
```

## 性能考虑

| 效果 | 性能消耗 | 建议 |
|------|---------|------|
| FXAA | 低 | 推荐使用 |
| Bokeh | 中 | 移动端可关闭 |
| Bloom | 中 | 按需使用 |
| SSAO | 高 | 仅 PC 端 |

### 移动端优化

```javascript
const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

if (!isMobile) {
  // 仅 PC 端启用景深
  composer.addPass(bokehPass);
}
```

## 总结

通过后处理，我们的 3D 场景现在具备了：

- FXAA 抗锯齿 - 消除锯齿边缘
- 景深效果 - 增加画面层次感
- HDR 环境 - 真实的光照反射

这些效果组合起来，可以让画面质量提升一个档次。
