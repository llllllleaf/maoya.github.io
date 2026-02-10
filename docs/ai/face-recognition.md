---
description: 用 Python + dlib 构建人脸识别 API，涵盖人脸检测、68关键点定位和特征比对
---

# Python+dlib人脸识别API

本文讲解如何用 Python + dlib 构建人脸识别 API。

## 技术选型

| 库 | 用途 |
|---|------|
| dlib | 人脸检测、68关键点定位 |
| OpenCV | 图像读取、处理、绘制 |
| Flask | Web API 服务 |
| NumPy | 数值计算 |

## 环境安装

```bash
pip install dlib opencv-python flask numpy
```

需要下载预训练模型：
- `shape_predictor_68_face_landmarks.dat` - 68 关键点模型

## 人脸检测基础

```python
import cv2
import dlib
import numpy as np

# 初始化检测器
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor('shape_predictor_68_face_landmarks.dat')

# 读取图像
img = cv2.imread('face.jpg')
img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# 检测人脸
faces = detector(img_gray, 0)
print(f'检测到 {len(faces)} 张人脸')

# 遍历每张人脸
for face in faces:
    # 获取人脸框
    x1, y1, x2, y2 = face.left(), face.top(), face.right(), face.bottom()
    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
```

## 68 关键点检测

dlib 可以检测 68 个面部关键点：

```
1-17:   下巴轮廓
18-22:  左眉毛
23-27:  右眉毛
28-31:  鼻梁
32-36:  鼻尖
37-42:  左眼
43-48:  右眼
49-60:  外嘴唇
61-68:  内嘴唇
```

```python
for face in faces:
    # 获取 68 个关键点
    landmarks = predictor(img, face)

    # 转换为坐标数组
    points = np.array([[p.x, p.y] for p in landmarks.parts()])

    # 绘制每个关键点
    for idx, (x, y) in enumerate(points):
        cv2.circle(img, (x, y), 2, (0, 255, 0), -1)
        cv2.putText(img, str(idx + 1), (x, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 0, 0), 1)
```

## 眼睛状态检测

通过关键点计算眼睛开合程度：

```python
def eye_aspect_ratio(eye_points):
    """
    计算眼睛纵横比 (EAR)
    EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
    """
    # 垂直距离
    v1 = np.linalg.norm(eye_points[1] - eye_points[5])
    v2 = np.linalg.norm(eye_points[2] - eye_points[4])

    # 水平距离
    h = np.linalg.norm(eye_points[0] - eye_points[3])

    ear = (v1 + v2) / (2.0 * h)
    return ear

# 获取左眼和右眼的关键点
left_eye = points[36:42]   # 37-42
right_eye = points[42:48]  # 43-48

left_ear = eye_aspect_ratio(left_eye)
right_ear = eye_aspect_ratio(right_eye)

# EAR < 0.2 通常表示眼睛闭合
if (left_ear + right_ear) / 2 < 0.2:
    print("眼睛闭合")
```

## Flask API 封装

```python
from flask import Flask, request, jsonify
import cv2
import dlib
import numpy as np
import base64

app = Flask(__name__)

detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor('shape_predictor_68_face_landmarks.dat')

@app.route('/api/detect', methods=['POST'])
def detect_face():
    # 获取 base64 图像
    data = request.json
    img_b64 = data.get('image')

    # 解码图像
    img_bytes = base64.b64decode(img_b64)
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 检测人脸
    faces = detector(img_gray, 0)

    results = []
    for face in faces:
        landmarks = predictor(img, face)
        points = [[p.x, p.y] for p in landmarks.parts()]

        results.append({
            'bbox': {
                'x1': face.left(),
                'y1': face.top(),
                'x2': face.right(),
                'y2': face.bottom()
            },
            'landmarks': points
        })

    return jsonify({
        'count': len(faces),
        'faces': results
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

## API 调用示例

```python
import requests
import base64

# 读取图像并转 base64
with open('face.jpg', 'rb') as f:
    img_b64 = base64.b64encode(f.read()).decode()

# 调用 API
response = requests.post(
    'http://localhost:5000/api/detect',
    json={'image': img_b64}
)

result = response.json()
print(f"检测到 {result['count']} 张人脸")

for face in result['faces']:
    print(f"人脸框: {face['bbox']}")
    print(f"关键点数量: {len(face['landmarks'])}")
```

## 性能优化

### 1. 图像预处理

```python
# 缩小图像加快检测
scale = 0.5
small_img = cv2.resize(img, None, fx=scale, fy=scale)
faces = detector(small_img, 0)

# 还原坐标
for face in faces:
    x1 = int(face.left() / scale)
    y1 = int(face.top() / scale)
    # ...
```

### 2. 批量处理

```python
# 使用 dlib 的批量检测
faces = detector(img_gray, 1)  # 第二个参数是上采样次数
```

### 3. GPU 加速

```python
# 如果有 CUDA，使用 GPU 版本的 dlib
import dlib
dlib.DLIB_USE_CUDA  # 检查 CUDA 支持
```

## 应用场景

- **疲劳检测** - 监测眼睛闭合频率
- **表情识别** - 分析面部关键点变化
- **人脸对齐** - 用于后续的人脸识别
- **美颜滤镜** - 定位面部区域进行处理

## 资源

- [dlib 官网](http://dlib.net/)
- [68 关键点模型下载](http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2)
- [OpenCV 文档](https://docs.opencv.org/)
