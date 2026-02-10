---
description: WebGL Shader 编程进阶系列，涵盖 GLSL 图片特效、光线行进、海洋渲染和流体 Blob 效果
---

# Shader 进阶系列

Shader（着色器）是 WebGL 的核心，掌握 Shader 编程可以实现各种炫酷的视觉效果。

本系列基于真实项目，带你从入门到进阶。

## 系列文章

| 文章 | 核心技术 | 应用场景 |
|------|----------|----------|
| [Shader入门：图片特效实现](./image-effects) | GLSL基础、UV坐标、纹理采样 | 图片滤镜、特效 |
| [光线行进原理与实践](./raymarching) | SDF、光线行进算法 | 3D图形生成 |
| [WebGL流体Blob效果](./webgl-blob) | 3D噪声、余弦调色板 | 动态背景、品牌展示 |
| [Seascape海洋着色器](./scroll-wave) | 光线行进、高度图追踪、菲涅尔 | 网站背景、着陆页 |

## 什么是 Shader？

Shader 是运行在 GPU 上的小程序，用于计算每个像素的颜色。

```
顶点着色器(Vertex Shader) → 处理顶点位置
          ↓
片元着色器(Fragment Shader) → 计算像素颜色
          ↓
        最终画面
```

## 技术栈

- **GLSL** - OpenGL 着色语言
- **Three.js** - WebGL 3D 库
- **Vite** - 现代构建工具
- **glsl-noise** - 噪声函数库

## 核心能力覆盖

| 能力 | 涉及文章 |
|------|----------|
| GLSL 基础语法 | 图片特效、所有文章 |
| 纹理采样与处理 | 图片特效 |
| 噪声函数应用 | Blob效果、Seascape海洋 |
| SDF 图形绘制 | 光线行进 |
| 顶点变形 | Blob效果 |
| 光线行进渲染 | 光线行进、Seascape海洋 |
| 余弦调色板 | Blob效果 |

## 为什么学 Shader？

1. **性能** - GPU 并行计算，比 CPU 快几个数量级
2. **效果** - 实现 CSS/Canvas 无法做到的视觉效果
3. **创意** - 生成艺术、数据可视化、游戏特效

## 前置知识

- JavaScript 基础
- Three.js 基础
- 基本的数学概念（向量、矩阵）

## 学习路径

1. **入门**：[图片特效](./image-effects) → 掌握 GLSL 基础语法
2. **进阶**：[Blob效果](./webgl-blob) / [Seascape海洋](./scroll-wave) → 学习噪声和光线行进
3. **高级**：[光线行进](./raymarching) → 理解 SDF 和 3D 渲染原理

让我们开始探索 Shader 的世界！
