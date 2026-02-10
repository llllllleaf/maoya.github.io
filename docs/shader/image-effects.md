---
description: GLSL Shader 入门教程，实现波浪扭曲、像素化、灰度、色相偏移、RGB 分离 6 种图片特效
---

# Shader入门：图片特效实现

本文带你用 GLSL 实现图片特效，掌握 Shader 编程的基础。

## 效果说明

<iframe src="/demos/image-effects.html" width="100%" height="400" style="border: none; border-radius: 8px;"></iframe>

展示了6种常见图片特效：原始图案、波浪扭曲、像素化、灰度、色相偏移、RGB分离。

## 项目结构

```
src/
├── Experience/
│   ├── Shaders/
│   │   └── Slider/
│   │       ├── vert.glsl    # 顶点着色器
│   │       └── frag.glsl    # 片元着色器
│   └── World/
│       └── Slider.js        # 图片组件
└── main.js
```

## GLSL 基础

### 数据类型

```glsl
float a = 1.0;        // 浮点数
vec2 uv = vec2(0.5);  // 二维向量
vec3 color = vec3(1.0, 0.0, 0.0);  // RGB颜色
vec4 rgba = vec4(1.0);  // RGBA
mat4 matrix;          // 4x4矩阵
sampler2D texture;    // 2D纹理
```

### 内置函数

```glsl
// 数学函数
sin(x), cos(x), tan(x)
abs(x), floor(x), ceil(x)
min(a, b), max(a, b), clamp(x, min, max)
mix(a, b, t)  // 线性插值
smoothstep(edge0, edge1, x)  // 平滑插值

// 向量函数
length(v)     // 向量长度
normalize(v)  // 归一化
dot(a, b)     // 点积
cross(a, b)   // 叉积
```

## 顶点着色器

顶点着色器处理每个顶点的位置：

```glsl
// vert.glsl
uniform float iTime;
uniform vec3 iResolution;

varying vec2 vUv;  // 传递给片元着色器

uniform float uVelocity;
uniform float uDistortX;
uniform float uDistortZ;

// 变形函数
vec3 distort(vec3 p) {
    // 根据滚动速度产生波浪变形
    p.x += sin(uv.y * 3.14159) * uVelocity * uDistortX;
    p.z += cos((p.x / iResolution.y) * 3.14159) * abs(uVelocity) * uDistortZ;
    return p;
}

void main() {
    vec3 p = position;

    // 计算模型视图矩阵
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);

    // 应用变形
    mvPosition.xyz = distort(mvPosition.xyz);

    // 最终位置
    gl_Position = projectionMatrix * mvPosition;

    // 传递UV坐标
    vUv = uv;
}
```

## 片元着色器

片元着色器计算每个像素的颜色：

```glsl
// frag.glsl
uniform float iTime;
uniform vec3 iResolution;
uniform sampler2D uTexture;
uniform vec2 uMediaSize;
uniform float uOpacity;

varying vec2 vUv;

// Cover模式（类似CSS background-size: cover）
vec2 cover(vec2 screenSize, vec2 imageSize, vec2 uv) {
    float screenRatio = screenSize.x / screenSize.y;
    float imageRatio = imageSize.x / imageSize.y;

    vec2 newSize = screenRatio < imageRatio
        ? vec2(imageSize.x * screenSize.y / imageSize.y, screenSize.y)
        : vec2(screenSize.x, imageSize.y * screenSize.x / imageSize.x);

    vec2 offset = screenRatio < imageRatio
        ? vec2((newSize.x - screenSize.x) / 2.0, 0.0)
        : vec2(0.0, (newSize.y - screenSize.y) / 2.0);

    return uv * screenSize / newSize + offset / newSize;
}

void main() {
    vec2 uv = vUv;

    // 应用cover缩放
    uv = cover(iResolution.xy, uMediaSize.xy, uv);

    // 采样纹理
    vec4 tex = texture2D(uTexture, uv);

    // 输出颜色
    gl_FragColor = vec4(tex.rgb, uOpacity);
}
```

## 常用图片特效

### 1. 灰度效果

```glsl
vec3 grayscale(vec3 color) {
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    return vec3(gray);
}
```

### 2. 亮度对比度

```glsl
vec3 brightnessContrast(vec3 color, float brightness, float contrast) {
    color += brightness;
    color = (color - 0.5) * contrast + 0.5;
    return color;
}
```

### 3. 色相偏移

```glsl
vec3 hueShift(vec3 color, float shift) {
    // RGB转HSV
    // 修改H值
    // HSV转回RGB
    // ...
}
```

### 4. 像素化

```glsl
vec2 pixelate(vec2 uv, float pixels) {
    float dx = 1.0 / pixels;
    return floor(uv / dx) * dx;
}
```

### 5. 波浪变形

```glsl
vec2 wave(vec2 uv, float time) {
    uv.x += sin(uv.y * 10.0 + time) * 0.02;
    uv.y += cos(uv.x * 10.0 + time) * 0.02;
    return uv;
}
```

## 在 Three.js 中使用

```javascript
import * as THREE from 'three';
import vertexShader from './shaders/vert.glsl';
import fragmentShader from './shaders/frag.glsl';

// 创建自定义材质
const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3() },
        uTexture: { value: texture },
        uMediaSize: { value: new THREE.Vector2(1920, 1080) },
        uOpacity: { value: 1.0 },
        uVelocity: { value: 0 },
        uDistortX: { value: 0.5 },
        uDistortZ: { value: 0.5 }
    },
    transparent: true
});

// 创建平面
const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// 动画循环中更新
function animate() {
    material.uniforms.iTime.value += 0.01;
    // ...
}
```

## Vite 配置

使用 `vite-plugin-glsl` 导入 GLSL 文件：

```javascript
// vite.config.js
import glsl from 'vite-plugin-glsl';

export default {
    plugins: [glsl()]
};
```

## 调试技巧

### 1. 可视化 UV

```glsl
// 用颜色显示UV坐标
gl_FragColor = vec4(uv, 0.0, 1.0);
```

### 2. 可视化数值

```glsl
// 把数值映射到颜色
float value = someCalculation();
gl_FragColor = vec4(vec3(value), 1.0);
```

### 3. 使用 lil-gui

```javascript
import GUI from 'lil-gui';

const gui = new GUI();
gui.add(material.uniforms.uDistortX, 'value', 0, 2).name('X变形');
gui.add(material.uniforms.uDistortZ, 'value', 0, 2).name('Z变形');
```

