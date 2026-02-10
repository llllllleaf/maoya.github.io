---
description: Three.js 实战系列，基于真实商业项目，涵盖 3D 展厅、VR 全景、园区沙盘、后处理等完整实现
---

# Three.js 实战系列

本系列文章基于 **真实商业项目** 经验，涵盖 3D 展厅、VR 全景、园区沙盘等多种场景的完整实现方案。

## 项目实战

从实际项目出发，详解各类 3D 场景的技术实现：

| 文章 | 核心技术 | 应用场景 |
|------|----------|----------|
| [沉浸式科普展馆3D漫游](./life-science-museum-vr) | 360°全景、OrbitControls、陀螺仪VR | 科普展馆、虚拟看房 |
| [等距空间3D品牌展厅](./isometric-space) | DRACO压缩、HDR环境、后处理、多场景动画 | 品牌发布、产品展示 |
| [立方体全景VR展厅](./vr-panorama-awards) | 立方体全景、Sprite热点、场景切换动画 | VR展厅、线上纪念馆 |
| [3D园区沙盘展示系统](./3d-campus-sandbox) | 环境贴图反射、lookAt跟随、热点交互 | 园区展示、智慧城市 |

## 基础教程

从零开始，掌握 Three.js 核心概念：

| 文章 | 内容 |
|------|------|
| [从零搭建3D场景展示系统](./3d-scene-system) | Scene、Camera、Renderer、OrbitControls 配置 |
| [GLTF模型加载与DRACO压缩](./gltf-draco) | GLTFLoader、DRACOLoader、加载进度条 |
| [后处理效果实现](./post-processing) | EffectComposer、FXAA抗锯齿、BokehPass景深 |

## 技术栈

- **Three.js** - WebGL 3D 渲染库
- **Vue 2/3** - 前端框架
- **GLTF/GLB** - 3D 模型格式
- **DRACO** - 模型压缩（体积减少 70%+）
- **HDR** - 高动态范围环境贴图
- **GSAP/TweenMax** - 动画库

## 核心能力覆盖

通过本系列，你将掌握：

| 能力 | 涉及文章 |
|------|----------|
| 360°全景漫游 | 科普展馆、立方体全景 |
| 热点交互系统 | 立方体全景、园区沙盘 |
| 模型加载优化 | DRACO压缩、等距空间 |
| 后处理效果 | 等距空间、后处理教程 |
| 环境贴图反射 | 等距空间、园区沙盘 |
| 移动端适配 | 科普展馆 |

## 前置知识

- JavaScript / ES6+ 基础
- 基本的 3D 概念（坐标系、向量、矩阵）
- Vue 基础（可选，项目使用 Vue 作为框架）

## 开始学习

建议按以下顺序学习：

1. **入门**：[从零搭建3D场景展示系统](./3d-scene-system) → 理解核心概念
2. **进阶**：[GLTF模型加载](./gltf-draco) → 掌握模型处理
3. **实战**：选择感兴趣的项目文章深入学习

Let's build something amazing!
