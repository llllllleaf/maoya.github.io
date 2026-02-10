---
description: WebGL 流体 Blob 效果实现，使用 3D 噪声扭曲和余弦调色板打造类液态金属流动形态
---

# WebGL流体Blob效果

本文实现一个流动的 3D Blob 效果，核心技术包括 **3D噪声扭曲** 和 **余弦调色板**。

## 效果预览

<iframe src="/demos/blob.html" width="100%" height="400" style="border: none; border-radius: 8px;"></iframe>

Blob 是一种类似液态金属的 3D 形态，通过噪声函数使表面产生流动感：

- 顶点位置随时间扭曲
- 颜色随扭曲程度变化
- 整体呈现有机的流体感

## 项目结构

```
scripts/
├── index.js           # 入口文件
└── gl/
    ├── index.js       # WebGL场景初始化
    ├── Blob.js        # Blob组件
    └── shaders/
        ├── vertex.glsl    # 顶点着色器
        └── fragment.glsl  # 片元着色器
```

## 核心原理

### 1. 顶点扭曲

使用 3D 噪声函数扭曲球体顶点：

```
原始顶点 + 法向量 × 噪声值 = 扭曲后的顶点
```

### 2. 余弦调色板

根据扭曲程度动态计算颜色，实现渐变效果。

## 顶点着色器

顶点着色器负责扭曲顶点位置：

```glsl
// vertex.glsl
varying vec2 vUv;
varying float vDistort;  // 传递扭曲值给片元着色器

uniform float uTime;
uniform float uSpeed;
uniform float uNoiseDensity;
uniform float uNoiseStrength;
uniform float uFreq;
uniform float uAmp;
uniform float uOffset;

// 引入噪声函数（需要 glsl-noise 库）
#pragma glslify: pnoise = require(glsl-noise/periodic/3d)
#pragma glslify: rotateY = require(glsl-rotate/rotateY)

// 值映射函数
float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

void main() {
    vUv = uv;

    float t = uTime * uSpeed;

    // 1. 使用周期性3D噪声计算扭曲值
    float distortion = pnoise(
        (normal + t) * uNoiseDensity,
        vec3(10.0)
    ) * uNoiseStrength;

    // 2. 沿法向量方向扭曲顶点
    vec3 pos = position + (normal * distortion);

    // 3. 添加Y轴旋转动画
    float angle = sin(uv.y * uFreq + t) * uAmp;
    pos = rotateY(pos, angle);

    // 4. 添加缩放呼吸效果
    pos *= map(sin(uTime + uOffset), -1.0, 1.0, 1.0, 1.2);

    // 传递扭曲值
    vDistort = distortion;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

### 关键点解析

| 参数 | 作用 |
|------|------|
| `uNoiseDensity` | 噪声密度，值越大表面越细碎 |
| `uNoiseStrength` | 噪声强度，控制扭曲幅度 |
| `uFreq` / `uAmp` | Y轴旋转的频率和振幅 |
| `uOffset` | 呼吸动画的相位偏移 |

## 片元着色器

片元着色器使用余弦调色板计算颜色：

```glsl
// fragment.glsl
varying vec2 vUv;
varying float vDistort;

uniform float uTime;
uniform float uHue;
uniform float uAlpha;

// 余弦调色板函数
vec3 cosPalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    float distort = vDistort * 0.5;

    // 调色板参数
    vec3 brightness = vec3(0.5, 0.5, 0.5);
    vec3 contrast = vec3(0.5, 0.5, 0.5);
    vec3 oscilation = vec3(1.0, 1.0, 1.0);
    vec3 phase = vec3(0.0, 0.1, 0.2);

    // 根据扭曲值计算颜色
    vec3 color = cosPalette(uHue + distort, brightness, contrast, oscilation, phase);

    gl_FragColor = vec4(color, uAlpha);
}
```

### 余弦调色板原理

余弦调色板是 [Inigo Quilez](https://iquilezles.org/articles/palettes/) 提出的技术：

```glsl
color = a + b * cos(2π * (c * t + d))
```

| 参数 | 作用 |
|------|------|
| `a` | 基础亮度 |
| `b` | 振幅（对比度） |
| `c` | 颜色循环频率 |
| `d` | 相位偏移（控制起始颜色） |

通过调整这四个参数，可以生成丰富的渐变色彩。

## Blob 组件

```javascript
// gl/Blob.js
import * as THREE from 'three';
import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';

export default class Blob extends THREE.Object3D {
    constructor(size, speed, color, density, strength, offset) {
        super();

        // 使用二十面体作为基础几何体
        // 细分64次使表面平滑
        this.geometry = new THREE.IcosahedronGeometry(size, 64);

        this.material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uSpeed: { value: speed },
                uNoiseDensity: { value: density },
                uNoiseStrength: { value: strength },
                uFreq: { value: 3 },
                uAmp: { value: 6 },
                uHue: { value: color },
                uOffset: { value: offset },
                uAlpha: { value: 1.0 },
            },
            transparent: true,
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.add(this.mesh);
    }
}
```

### 为什么用二十面体？

`IcosahedronGeometry` 的顶点分布均匀，细分后比球体更平滑：

```javascript
// 参数：半径、细分次数
new THREE.IcosahedronGeometry(6.0, 64);
```

## WebGL 场景初始化

```javascript
// gl/index.js
import * as THREE from 'three';

export default new class Gl {
    constructor() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true  // 透明背景
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 18);

        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();

        this.init();
        this.animate();
    }

    init() {
        document.body.appendChild(this.renderer.domElement);
        window.addEventListener('resize', this.resize.bind(this));
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.updateProjectionMatrix();
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.render();
    }

    render() {
        // 更新所有子对象的时间 uniform
        this.scene.children.forEach(mesh => {
            mesh.material.uniforms.uTime.value = this.clock.getElapsedTime();
        });

        this.renderer.render(this.scene, this.camera);
    }
}
```

## 使用方式

```javascript
// index.js
import Gl from './gl';
import Blob from './gl/Blob';

// 创建 Blob
// 参数：size, speed, color, density, strength, offset
const blob = new Blob(6.0, 0.15, 0.4, 2.0, 0.3, Math.PI * 2);

// 设置位置
blob.position.set(11, -3, -10);
blob.rotation.set(0.4, 1.0, -0.4);

// 添加到场景
Gl.scene.add(blob);
```

## 依赖配置

需要安装 glsl 相关依赖：

```bash
npm install glsl-noise glsl-rotate glslify-loader
```

使用 Parcel 或配置 webpack/vite 的 glslify 插件。

## 参数调节效果

| 参数组合 | 效果 |
|----------|------|
| 高 density + 低 strength | 细腻的表面纹理 |
| 低 density + 高 strength | 大块的流动感 |
| 调整 uHue | 改变整体色调 |
| 调整 phase | 改变颜色渐变方向 |

## 扩展思路

1. **鼠标交互**：让 Blob 跟随鼠标旋转
2. **多个 Blob**：创建不同参数的 Blob 组合
3. **音频响应**：用音频数据驱动 uNoiseStrength
4. **后处理**：添加辉光效果增强视觉

## 小结

本文实现的 Blob 效果涉及：

- **3D 噪声扭曲** - 使用 pnoise 函数扭曲顶点
- **余弦调色板** - 动态生成渐变颜色
- **IcosahedronGeometry** - 均匀分布的球形网格
- **Shader Material** - Three.js 自定义着色器

这些技术组合可以创造出各种有机的、流动的视觉效果。
