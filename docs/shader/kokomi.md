# Kokomi.js 使用指南

Kokomi.js 是一个 Three.js 辅助库，让创建 Shader 项目更加简单。

## 安装

```bash
npm install kokomi.js three
```

## 快速开始

```javascript
import * as kokomi from 'kokomi.js';

class Sketch extends kokomi.Base {
    create() {
        // 创建自定义网格
        const mesh = new kokomi.CustomMesh(this, {
            geometry: new THREE.PlaneGeometry(1, 1),
            vertexShader: `...`,
            fragmentShader: `...`,
            uniforms: {
                uTime: { value: 0 }
            }
        });
        mesh.addExisting();
    }

    update() {
        // 每帧更新
        if (this.customMesh) {
            this.customMesh.material.uniforms.uTime.value = this.clock.elapsedTime;
        }
    }
}

const sketch = new Sketch('#app');
sketch.create();
```

## 核心特性

### 1. 自定义材质

```javascript
const customMesh = new kokomi.CustomMesh(this, {
    geometry: new THREE.SphereGeometry(1, 64, 64),
    vertexShader,
    fragmentShader,
    uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2() }
    }
});
```

### 2. 着色器注入

自动注入常用 uniform：

```glsl
uniform float iTime;
uniform vec3 iResolution;
uniform vec4 iMouse;
```

### 3. GPGPU 计算

```javascript
const gpgpu = new kokomi.GPUComputer(this, {
    width: 512,
    height: 512,
    computeShader: `
        void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            // 计算逻辑
            gl_FragColor = vec4(result, 1.0);
        }
    `
});
```

### 4. 后处理

```javascript
const composer = new kokomi.EffectComposer(this);
composer.addPass(new kokomi.RenderPass(this));
composer.addPass(new kokomi.UnrealBloomPass());
```

## 常用组件

### ScreenQuad

全屏四边形，用于后处理或全屏 Shader：

```javascript
const screenQuad = new kokomi.ScreenQuad(this, {
    fragmentShader: `
        void main() {
            vec2 uv = vUv;
            gl_FragColor = vec4(uv, 0.0, 1.0);
        }
    `
});
```

### RayMarcher

快速创建光线行进场景：

```javascript
const rayMarcher = new kokomi.RayMarcher(this, {
    fragmentShader: `
        float sceneSDF(vec3 p) {
            return length(p) - 1.0;
        }
    `
});
```

### ParticleSystem

粒子系统：

```javascript
const particles = new kokomi.ParticleSystem(this, {
    count: 10000,
    vertexShader: `...`,
    fragmentShader: `...`
});
```

## 项目模板

```javascript
import * as THREE from 'three';
import * as kokomi from 'kokomi.js';

import vertexShader from './shaders/vert.glsl';
import fragmentShader from './shaders/frag.glsl';

class Sketch extends kokomi.Base {
    create() {
        // 相机设置
        this.camera.position.z = 2;

        // 创建网格
        this.mesh = new kokomi.CustomMesh(this, {
            geometry: new THREE.PlaneGeometry(1, 1, 32, 32),
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uTexture: { value: null }
            }
        });
        this.mesh.addExisting();

        // 加载纹理
        this.loadTexture();
    }

    async loadTexture() {
        const texture = await new THREE.TextureLoader().loadAsync('/image.jpg');
        this.mesh.material.uniforms.uTexture.value = texture;
    }

    update() {
        this.mesh.material.uniforms.uTime.value = this.clock.elapsedTime;
    }
}

const sketch = new Sketch('#app');
sketch.create();
```

## 与 Vite 配合

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
    plugins: [glsl()]
});
```

## 资源

- [Kokomi.js GitHub](https://github.com/alphardex/kokomi.js)
- [Kokomi.js 文档](https://kokomi-js.vercel.app/)
- [示例项目](https://github.com/alphardex/threejs-playground)
