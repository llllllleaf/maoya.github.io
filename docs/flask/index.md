# Flask 全栈系列

本系列涵盖 Flask Web 开发的最佳实践，从博客系统到 AI 服务。

## 系列文章

### Web 应用开发

| 文章 | 内容 |
|------|------|
| [Flask博客系统架构设计](./blog-architecture) | 项目结构、数据模型、功能模块 |
| [应用工厂与蓝图模块化](./factory-blueprint) | 工厂模式、蓝图、扩展管理 |

### AI 服务开发

| 文章 | 内容 |
|------|------|
| [Flask+TensorFlow AI服务实战](./ai-service) | 模型预加载、API设计、并发优化 |

## 技术栈

**Web 开发**
- **Flask** - 轻量级 Web 框架
- **SQLAlchemy** - ORM 数据库操作
- **Flask-Login** - 用户认证
- **Flask-WTF** - 表单验证
- **Flask-Migrate** - 数据库迁移

**AI 服务**
- **TensorFlow** - 深度学习框架
- **OpenCV** - 图像处理
- **Gevent** - 协程并发
- **Gunicorn** - 生产级服务器

## 核心能力

| 能力 | 涉及文章 |
|------|----------|
| 应用工厂模式 | 蓝图模块化 |
| 蓝图组织 | 博客架构、蓝图模块化 |
| 数据模型设计 | 博客架构 |
| 模型预加载 | AI 服务实战 |
| API 设计 | AI 服务实战 |
| 并发优化 | AI 服务实战 |

## 项目示例

### 博客系统结构

```
bluelog/
├── __init__.py       # 应用工厂
├── models.py         # 数据模型
├── forms.py          # 表单定义
├── extensions.py     # 扩展实例
├── settings.py       # 配置类
└── blueprints/       # 蓝图目录
    ├── admin.py      # 后台管理
    ├── auth.py       # 用户认证
    └── blog.py       # 博客前台
```

### AI 服务结构

```
Flask-api/
├── flask_run.py              # Flask 主程序
├── face_detection_model.pb   # 检测模型
├── face_recognition_model.pb # 识别模型
├── face/                     # 特征存储
└── tmp/                      # 临时文件
```

## 前置知识

- Python 基础
- HTML/CSS 基础
- 数据库基本概念
- HTTP 协议基础

## 学习路径

1. **入门**：[博客架构设计](./blog-architecture) → 理解 Flask 项目组织
2. **进阶**：[蓝图模块化](./factory-blueprint) → 掌握工厂模式和蓝图
3. **实战**：[AI服务实战](./ai-service) → 构建高性能 AI 推理服务
