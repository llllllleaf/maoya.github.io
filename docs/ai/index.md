---
description: AI 实践系列文章，涵盖前沿播客深度解析、GPT 从零构建、图像分类、人脸识别等深度学习项目实战
---

# AI 实践系列

本系列记录我的 AI 学习路径，从前沿认知到动手实践，从播客深度学习到从零构建大模型。

## 学习路径

```
前沿认知                    深度实践                    项目实战
   │                          │                          │
   ▼                          ▼                          ▼
Lex Fridman #490  ────→  从零构建 GPT          CIFAR-10 图像分类
   │                          │                          │
   │  AI 全景认知              │  手撕 Transformer        │  掌握 CNN/ResNet
   │  Scaling Laws            │  注意力机制               ▼
   │  RLHF/RLVR              │  预训练到微调        dlib 人脸识别 API
   │                          │                          │
   └──── 好奇心驱动 ────→     └──── 代码验证 ────→       ▼
                                                   TensorFlow 人脸登录
```

## 系列文章

### 前沿探索

| 文章 | 核心内容 | 关键词 |
|------|----------|--------|
| [4.5 小时 AI 深度对谈：我从 Lex Fridman #490 中学到了什么](./state-of-ai-2026-podcast) | Lex Fridman × Nathan Lambert × Sebastian Raschka | Scaling Laws、RLHF、MoE、开源闭源 |
| [手撕 GPT：从一行文本到下一词预测的完整链路](./build-gpt-from-scratch) | 7 天从零用 PyTorch 构建类 GPT 模型 | Transformer、注意力机制、BPE、预训练 |

### 基础入门

| 文章 | 核心技术 | 学习目标 |
|------|----------|----------|
| [CIFAR-10图像分类入门](./cifar10-classification) | CNN、ResNet、TF-Slim | 掌握图像分类基础、理解深度学习训练流程 |

### 项目实战

| 文章 | 核心技术 | 应用场景 |
|------|----------|----------|
| [Python+dlib人脸识别API](./face-recognition) | dlib、68关键点、Flask | 人脸检测、表情识别 |
| [TensorFlow+小程序人脸登录](./wechat-face-recognition) | FaceNet、TensorFlow、微信小程序 | 刷脸登录、身份验证 |

## 技术栈

- **Python** - 编程语言
- **PyTorch** - 深度学习框架（GPT 构建）
- **TensorFlow** - 深度学习框架（人脸识别）
- **FaceNet** - 人脸识别模型（128维特征向量）
- **dlib** - 机器学习库（人脸检测、关键点）
- **OpenCV** - 图像处理
- **Flask** - Web API 框架

## 推荐学习顺序

1. **认知**：[Lex Fridman #490 播客笔记](./state-of-ai-2026-podcast) → 建立 AI 全景认知
2. **构建**：[手撕 GPT](./build-gpt-from-scratch) → 从零理解 Transformer 架构
3. **入门**：[CIFAR-10图像分类](./cifar10-classification) → 理解 CNN、训练流程、数据增强
4. **实战1**：[dlib人脸识别](./face-recognition) → 掌握人脸检测、关键点定位
5. **实战2**：[TensorFlow人脸登录](./wechat-face-recognition) → 深度学习人脸识别、端到端应用
