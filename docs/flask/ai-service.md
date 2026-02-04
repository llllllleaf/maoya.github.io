# Flask + TensorFlow AI 服务实战

本文基于人脸识别项目，讲解如何用 Flask 构建高性能的 AI 推理服务，涵盖 **模型预加载**、**API 设计**、**图像处理**、**并发优化** 等核心实践。

## 项目概述

构建一个完整的人脸识别 API 服务，支持：

- 人脸检测
- 人脸注册（特征提取并存储）
- 人脸登录（特征比对验证）
- 人脸关键点检测

## 项目结构

```
Flask-api/
├── flask_run.py                 # Flask 主程序
├── face_detection_model.pb      # 人脸检测模型
├── face_recognition_model.pb    # 人脸识别模型（FaceNet）
├── landmark.pb                  # 关键点检测模型
├── face/
│   └── feature.txt              # 注册人脸特征存储
├── tmp/                         # 临时文件目录
└── object_detection/            # TF Object Detection 工具
    ├── core/
    └── utils/
```

## 核心实践

### 1. 模型预加载

**关键原则**：在服务启动时加载模型，而非每次请求时加载。

```python
import tensorflow as tf
from flask import Flask

app = Flask(__name__)

# 全局 Session - 服务启动时创建
detection_sess = tf.compat.v1.Session()
face_feature_sess = tf.Session()
face_landmark_sess = tf.Session()

# 人脸检测模型加载
PATH_TO_FROZEN_GRAPH = "face_detection_model.pb"

with detection_sess.as_default():
    od_graph_def = tf.compat.v1.GraphDef()
    with tf.io.gfile.GFile(PATH_TO_FROZEN_GRAPH, 'rb') as fid:
        serialized_graph = fid.read()
        od_graph_def.ParseFromString(serialized_graph)
        tf.import_graph_def(od_graph_def, name='')

    # 获取输入输出张量
    image_tensor = tf.compat.v1.get_default_graph().get_tensor_by_name('image_tensor:0')

    # 获取所有输出张量
    ops = tf.compat.v1.get_default_graph().get_operations()
    all_tensor_names = {output.name for op in ops for output in op.outputs}

    tensor_dict = {}
    for key in ['num_detections', 'detection_boxes',
                'detection_scores', 'detection_classes']:
        tensor_name = key + ':0'
        if tensor_name in all_tensor_names:
            tensor_dict[key] = tf.compat.v1.get_default_graph().get_tensor_by_name(tensor_name)
```

**为什么要预加载？**

| 方式 | 首次请求 | 后续请求 | 内存占用 |
|------|----------|----------|----------|
| 每次加载 | ~5s | ~5s | 低（用完释放） |
| 预加载 | ~5s（启动时） | ~50ms | 高（常驻） |

### 2. 人脸识别模型加载

FaceNet 模型用于提取 128 维人脸特征向量：

```python
# 人脸识别模型加载
face_feature_sess = tf.Session()
ff_pb_path = "face_recognition_model.pb"

with face_feature_sess.as_default():
    ff_od_graph_def = tf.compat.v1.GraphDef()
    with tf.io.gfile.GFile(ff_pb_path, 'rb') as fid:
        serialized_graph = fid.read()
        ff_od_graph_def.ParseFromString(serialized_graph)
        tf.import_graph_def(ff_od_graph_def, name='')

    # 获取关键张量
    ff_images_placeholder = tf.get_default_graph().get_tensor_by_name("input:0")
    ff_train_placeholder = tf.get_default_graph().get_tensor_by_name("phase_train:0")
    ff_embeddings = tf.get_default_graph().get_tensor_by_name("embeddings:0")
```

### 3. 图像预处理

标准化处理提升模型效果：

```python
import numpy as np
import cv2

def prewhiten(x):
    """图像白化处理 - 零均值单位方差"""
    mean = np.mean(x)
    std = np.std(x)
    std_adj = np.maximum(std, 1.0 / np.sqrt(x.size))
    y = np.multiply(np.subtract(x, mean), 1 / std_adj)
    return y

def read_image(path):
    """读取并预处理图像"""
    im_data = cv2.imread(path)
    im_data = prewhiten(im_data)
    im_data = cv2.resize(im_data, (160, 160))  # FaceNet 输入尺寸
    return im_data
```

### 4. API 设计

#### 文件上传接口

```python
from flask import request
import os

@app.route("/upload", methods=['POST', 'GET'])
def upload():
    """通用文件上传"""
    f = request.files.get('file')
    # 保存到临时目录，保留原始扩展名
    upload_path = os.path.join("tmp/tmp." + f.filename.split(".")[-1])
    f.save(upload_path)
    return upload_path
```

#### 人脸检测接口

```python
@app.route("/face_detect")
def face_detect():
    """人脸检测 - 返回边界框坐标"""
    # URL 参数获取图片路径
    im_url = request.args.get('url')

    # 读取并调整尺寸
    im_data = cv2.imread(im_url)
    im_data = cv2.resize(im_data, IMAGE_SIZE)

    # 模型推理
    output_dict = detection_sess.run(
        tensor_dict,
        feed_dict={image_tensor: np.expand_dims(im_data, 0)}
    )

    # 解析输出
    output_dict['num_detections'] = int(output_dict['num_detections'][0])
    output_dict['detection_boxes'] = output_dict['detection_boxes'][0]
    output_dict['detection_scores'] = output_dict['detection_scores'][0]

    # 提取置信度最高的人脸框
    for i in range(len(output_dict['detection_scores'])):
        if output_dict['detection_scores'][i] > 0.1:
            bbox = output_dict['detection_boxes'][i]
            y1, x1, y2, x2 = bbox
            # 转换为像素坐标
            x1, y1 = int(x1 * IMAGE_SIZE[1]), int(y1 * IMAGE_SIZE[0])
            x2, y2 = int(x2 * IMAGE_SIZE[1]), int(y2 * IMAGE_SIZE[0])
            return str([x1, y1, x2, y2])

    return "no face detected"
```

#### 人脸注册接口

```python
@app.route("/face_register", methods=['POST', 'GET'])
def face_register():
    """人脸注册 - 提取特征并保存"""
    # 1. 接收上传图片
    f = request.files.get('file')
    upload_path = os.path.join("tmp/tmp." + f.filename.split(".")[-1])
    f.save(upload_path)

    # 2. 读取图片
    im_data = cv2.imread(upload_path)
    sp = im_data.shape
    im_data_re = cv2.resize(im_data, IMAGE_SIZE)

    # 3. 人脸检测
    output_dict = detection_sess.run(
        tensor_dict,
        feed_dict={image_tensor: np.expand_dims(im_data_re, 0)}
    )

    # 4. 解析检测结果
    output_dict['detection_boxes'] = output_dict['detection_boxes'][0]
    output_dict['detection_scores'] = output_dict['detection_scores'][0]

    for i in range(len(output_dict['detection_scores'])):
        if output_dict['detection_scores'][i] > 0.1:
            bbox = output_dict['detection_boxes'][i]

            # 5. 获取真实坐标并裁剪人脸
            y1 = int(bbox[0] * sp[0])
            x1 = int(bbox[1] * sp[1])
            y2 = int(bbox[2] * sp[0])
            x2 = int(bbox[3] * sp[1])
            face_data = im_data[y1:y2, x1:x2]

            # 6. 预处理
            face_data = prewhiten(face_data)
            face_data = cv2.resize(face_data, (160, 160))
            face_data = np.expand_dims(face_data, axis=0)

            # 7. 特征提取
            embedding = face_feature_sess.run(
                ff_embeddings,
                feed_dict={
                    ff_images_placeholder: face_data,
                    ff_train_placeholder: False
                }
            )

            # 8. 保存特征向量
            feature_str = ",".join(str(v) for v in embedding[0])
            with open("face/feature.txt", "w") as f:
                f.write(feature_str)

            return "success"

    return "fail"
```

#### 人脸登录接口

```python
@app.route("/face_login", methods=['POST', 'GET'])
def face_login():
    """人脸登录 - 特征比对验证"""
    # 1-7 步与注册相同，获取当前人脸特征 emb1
    # ...（省略重复代码）

    # 8. 加载已注册的人脸特征
    with open("face/feature.txt") as f:
        fea_str = f.readlines()
    emb2_str = fea_str[0].split(",")
    emb2 = np.array([float(s) for s in emb2_str])

    # 9. 欧氏距离计算相似度
    dist = np.linalg.norm(emb1 - emb2)

    # 10. 阈值判断
    if dist < 0.3:  # 经验阈值
        return "success"
    else:
        return "fail"
```

### 5. 并发优化

使用 Gevent 实现协程并发：

```python
from gevent import monkey
monkey.patch_all()  # 必须在导入其他模块前调用

from flask import Flask
app = Flask(__name__)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
```

**Gevent vs 多线程**

| 特性 | Gevent | 多线程 |
|------|--------|--------|
| 并发模型 | 协程 | 线程 |
| 切换开销 | 低 | 高 |
| GIL 影响 | 无 | 有 |
| 适用场景 | I/O 密集 | CPU 密集 |

### 6. GPU 配置

```python
import os

# 设置 TensorFlow 日志级别
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# 指定 GPU
os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"
os.environ["CUDA_VISIBLE_DEVICES"] = "0"  # 使用第一块 GPU
```

## 完整 API 列表

| 端点 | 方法 | 功能 | 参数 |
|------|------|------|------|
| `/` | GET | 健康检查 | - |
| `/upload` | POST | 文件上传 | file |
| `/face_detect` | GET | 人脸检测 | url |
| `/face_register` | POST | 人脸注册 | file |
| `/face_login` | POST | 人脸登录 | file |
| `/face_landmark` | POST | 关键点检测 | file |

## 特征比对原理

FaceNet 将人脸映射到 128 维欧几里得空间：

```
人脸图像 → CNN → 128维向量

相似度 = 欧氏距离(向量A, 向量B)
同一人: 距离 < 0.3
不同人: 距离 > 0.3
```

## 性能优化建议

### 1. 模型优化

```python
# 使用 TensorRT 加速（NVIDIA GPU）
# 使用 OpenVINO 加速（Intel CPU）
# 模型量化（FP32 → FP16/INT8）
```

### 2. 批处理

```python
# 多张图片批量推理
batch_images = np.stack([img1, img2, img3])
results = sess.run(output, feed_dict={input: batch_images})
```

### 3. 异步处理

```python
from flask import jsonify
import threading
import uuid

tasks = {}

@app.route("/async_detect", methods=['POST'])
def async_detect():
    task_id = str(uuid.uuid4())
    # 启动后台线程处理
    thread = threading.Thread(target=process_task, args=(task_id,))
    thread.start()
    return jsonify({"task_id": task_id})

@app.route("/task/<task_id>")
def get_task(task_id):
    return jsonify(tasks.get(task_id, {"status": "processing"}))
```

## 部署建议

### 开发环境

```bash
python flask_run.py
```

### 生产环境

```bash
# 使用 Gunicorn + Gevent
gunicorn -w 4 -k gevent -b 0.0.0.0:5000 flask_run:app

# 或使用 uWSGI
uwsgi --http :5000 --wsgi-file flask_run.py --callable app --processes 4
```

### Docker 部署

```dockerfile
FROM tensorflow/tensorflow:2.4.0-gpu

WORKDIR /app
COPY . .

RUN pip install flask gevent opencv-python-headless

EXPOSE 5000
CMD ["python", "flask_run.py"]
```

## 小结

构建 Flask AI 服务的核心实践：

1. **模型预加载** - 启动时加载，避免重复初始化
2. **Session 管理** - 全局 Session，多请求复用
3. **图像预处理** - 标准化、尺寸调整
4. **API 设计** - RESTful 风格，支持文件上传
5. **并发优化** - Gevent 协程处理 I/O 密集场景
6. **GPU 配置** - 指定设备，控制显存

这套架构可以扩展到其他 AI 服务场景：目标检测、图像分类、OCR、语音识别等。
