# AI 实践系列

本系列记录我的 AI 学习路径，从基础入门到项目实战，涵盖图像分类、人脸识别等领域。

## 学习路径

```
基础入门                      项目实战
   │                            │
   ▼                            ▼
CIFAR-10 图像分类  ────→  dlib 人脸识别 API
   │                            │
   │  掌握 CNN/ResNet           │  人脸检测、关键点
   │  理解训练流程              │  Flask API 服务
   │                            ▼
   └──────────────────→  TensorFlow 人脸登录
                               │
                               │  FaceNet 特征提取
                               │  小程序端集成
                               ▼
                            更多探索...
```

## 系列文章

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
- **TensorFlow** - 深度学习框架
- **TF-Slim** - TensorFlow 高级 API
- **FaceNet** - 人脸识别模型（128维特征向量）
- **dlib** - 机器学习库（人脸检测、关键点）
- **OpenCV** - 图像处理
- **Flask** - Web API 框架

## 核心能力

| 能力 | 涉及文章 |
|------|----------|
| CNN 网络构建 | CIFAR-10 图像分类 |
| ResNet 残差网络 | CIFAR-10 图像分类 |
| 数据增强 | CIFAR-10 图像分类 |
| 人脸检测 | dlib人脸识别、TensorFlow人脸登录 |
| 特征提取 | TensorFlow人脸登录（FaceNet） |
| 关键点定位 | dlib人脸识别（68点） |
| 模型服务化 | 所有实战项目（Flask API） |

## 前置知识

- Python 基础
- 基本的图像处理概念
- 线性代数基础（矩阵、向量）
- HTTP API 基础

## 推荐学习顺序

1. **入门**：[CIFAR-10图像分类](./cifar10-classification) → 理解 CNN、训练流程、数据增强
2. **实战1**：[dlib人脸识别](./face-recognition) → 掌握人脸检测、关键点定位
3. **实战2**：[TensorFlow人脸登录](./wechat-face-recognition) → 深度学习人脸识别、端到端应用
