# TensorFlow + 微信小程序：人脸识别签到系统实战

> 如何用 TensorFlow 和 FaceNet 构建一个完整的人脸识别系统，并通过微信小程序实现人脸注册和签到功能？本文以「中源协和生命医学奖」颁奖典礼签到系统为例，详解从模型部署到前后端联调的全流程。

## 项目背景

「中源协和生命医学奖」是中国生命科学领域的重要奖项，每年举办线下颁奖典礼，邀请国内外知名科学家、院士出席。传统的签到方式存在效率低、体验差的问题：

| 签到方式 | 问题 |
|----------|------|
| 纸质签到 | 排队耗时、字迹难辨、统计困难 |
| 扫码签到 | 需要掏手机、操作繁琐 |
| 证件签到 | 忘带证件、人工核验慢 |

为提升颁奖典礼的科技感和嘉宾体验，我们开发了 **人脸识别签到系统**，实现「刷脸即签」的无感签到体验。

## 为什么选择人脸识别？

| 维度 | 传统方式 | 人脸识别 |
|------|----------|----------|
| 效率 | 单人 10-30 秒 | 单人 1-2 秒 |
| 体验 | 需携带证件/手机 | 空手通过 |
| 安全性 | 可代签 | 生物特征唯一 |
| 科技感 | 普通 | 高端大气 |

**应用场景**：
- 高端会议签到
- 门禁系统
- 企业考勤
- 活动入场

## 项目成果

**核心功能**：
- **人脸检测**：实时识别图片中的人脸位置，绘制检测框
- **人脸注册**：嘉宾提前通过小程序注册人脸，提取 128 维特征向量
- **人脸签到**：现场刷脸，系统自动比对完成签到
- **微信小程序**：拍照上传、实时反馈、签到状态展示

**业务效果**：
- 签到效率提升 10 倍以上
- 嘉宾体验显著提升
- 为医学奖颁奖典礼增添科技亮点

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                   微信小程序                             │
│         拍照 → 上传图片 → 显示结果                        │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP API
┌───────────────────────────▼─────────────────────────────┐
│                    Flask 后端                            │
├─────────────┬─────────────┬─────────────────────────────┤
│ /face_detect│/face_register│      /face_login           │
│ 人脸检测    │ 人脸注册     │      人脸登录               │
└──────┬──────┴──────┬──────┴──────────┬──────────────────┘
       │             │                 │
┌──────▼─────────────▼─────────────────▼──────────────────┐
│                 TensorFlow 模型                          │
├─────────────┬─────────────┬─────────────────────────────┤
│ SSD 检测    │  FaceNet    │      Landmark               │
│ 人脸定位    │  特征提取    │      关键点检测              │
└─────────────┴─────────────┴─────────────────────────────┘
```

## 核心技术

### 1. FaceNet 人脸识别原理

FaceNet 是 Google 提出的人脸识别算法，核心思想是将人脸映射到 128 维向量空间：

```
人脸图片 → CNN → 128维特征向量（Embedding）

同一个人的特征向量距离近，不同人的距离远
```

**三元组损失（Triplet Loss）**：

```
L = max(0, ||f(anchor) - f(positive)||² - ||f(anchor) - f(negative)||² + margin)

- anchor: 基准人脸
- positive: 同一人的另一张人脸
- negative: 不同人的人脸
- margin: 安全间隔（通常 0.2）
```

### 2. 预训练模型

项目使用三个预训练模型：

| 模型 | 功能 | 输入尺寸 | 输出 |
|------|------|----------|------|
| face_detection_model.pb | 人脸检测 | 256×256 | 边界框坐标 |
| face_recognition_model.pb | 特征提取 | 160×160 | 128维向量 |
| landmark.pb | 关键点检测 | 128×128 | 68个关键点 |

## Flask API 实现

### 1. 模型加载

```python
import tensorflow as tf

# 人脸检测模型
detection_sess = tf.compat.v1.Session()
with detection_sess.as_default():
    od_graph_def = tf.compat.v1.GraphDef()
    with tf.io.gfile.GFile("face_detection_model.pb", 'rb') as fid:
        serialized_graph = fid.read()
        od_graph_def.ParseFromString(serialized_graph)
        tf.import_graph_def(od_graph_def, name='')

    # 获取输入输出张量
    image_tensor = tf.get_default_graph().get_tensor_by_name('image_tensor:0')
    tensor_dict = {
        'num_detections': tf.get_default_graph().get_tensor_by_name('num_detections:0'),
        'detection_boxes': tf.get_default_graph().get_tensor_by_name('detection_boxes:0'),
        'detection_scores': tf.get_default_graph().get_tensor_by_name('detection_scores:0'),
    }

# 人脸识别模型（FaceNet）
face_feature_sess = tf.Session()
with face_feature_sess.as_default():
    # 加载模型...
    ff_images_placeholder = tf.get_default_graph().get_tensor_by_name("input:0")
    ff_train_placeholder = tf.get_default_graph().get_tensor_by_name("phase_train:0")
    ff_embeddings = tf.get_default_graph().get_tensor_by_name("embeddings:0")
```

### 2. 人脸检测接口

```python
@app.route("/face_detect")
def face_detect():
    # 获取图片路径
    im_url = request.args.get('url')

    # 读取并预处理图片
    im_data = cv2.imread(im_url)
    im_data = cv2.resize(im_data, (256, 256))

    # 运行检测模型
    output_dict = detection_sess.run(
        tensor_dict,
        feed_dict={image_tensor: np.expand_dims(im_data, 0)}
    )

    # 解析检测结果
    for i in range(len(output_dict['detection_scores'])):
        if output_dict['detection_scores'][i] > 0.1:  # 置信度阈值
            bbox = output_dict['detection_boxes'][i]
            y1, x1, y2, x2 = bbox[0], bbox[1], bbox[2], bbox[3]

            # 转换为像素坐标
            x1 = int(x1 * 256)
            y1 = int(y1 * 256)
            x2 = int(x2 * 256)
            y2 = int(y2 * 256)

            return str([x1, y1, x2, y2])

    return "[]"
```

### 3. 图像预处理

FaceNet 要求输入图像经过标准化处理：

```python
def prewhiten(x):
    """图像数据标准化"""
    mean = np.mean(x)
    std = np.std(x)
    std_adj = np.maximum(std, 1.0 / np.sqrt(x.size))
    y = np.multiply(np.subtract(x, mean), 1 / std_adj)
    return y

def read_image(path):
    """读取并预处理图片"""
    im_data = cv2.imread(path)
    im_data = prewhiten(im_data)  # 标准化
    im_data = cv2.resize(im_data, (160, 160))  # FaceNet 输入尺寸
    return im_data
```

### 4. 人脸注册接口

```python
@app.route("/face_register", methods=['POST'])
def face_register():
    # 1. 接收上传的图片
    f = request.files.get('file')
    upload_path = "tmp/tmp." + f.filename.split(".")[-1]
    f.save(upload_path)

    # 2. 读取图片
    im_data = cv2.imread(upload_path)
    sp = im_data.shape
    im_data_re = cv2.resize(im_data, (256, 256))

    # 3. 人脸检测
    output_dict = detection_sess.run(
        tensor_dict,
        feed_dict={image_tensor: np.expand_dims(im_data_re, 0)}
    )

    # 4. 提取人脸区域
    for i in range(len(output_dict['detection_scores'])):
        if output_dict['detection_scores'][i] > 0.1:
            bbox = output_dict['detection_boxes'][i]

            # 获取真实坐标
            y1 = int(bbox[0] * sp[0])
            x1 = int(bbox[1] * sp[1])
            y2 = int(bbox[2] * sp[0])
            x2 = int(bbox[3] * sp[1])

            # 裁剪人脸
            face_data = im_data[y1:y2, x1:x2]

            # 5. 预处理
            face_data = prewhiten(face_data)
            face_data = cv2.resize(face_data, (160, 160))
            face_data = np.expand_dims(face_data, axis=0)

            # 6. 提取特征向量
            emb = face_feature_sess.run(
                ff_embeddings,
                feed_dict={
                    ff_images_placeholder: face_data,
                    ff_train_placeholder: False
                }
            )

            # 7. 保存特征向量
            feature_str = ",".join(str(i) for i in emb[0])
            with open("face/feature.txt", "w") as f:
                f.write(feature_str)

            return "success"

    return "fail"
```

### 5. 人脸登录接口

```python
@app.route("/face_login", methods=['POST'])
def face_login():
    # 1-6 步骤与注册类似，提取当前人脸特征向量 emb1

    # 7. 加载注册的人脸特征
    with open("face/feature.txt") as f:
        fea_str = f.read().split(",")
    emb2 = np.array([float(s) for s in fea_str])

    # 8. 计算欧氏距离
    dist = np.linalg.norm(emb1 - emb2)

    # 9. 判断是否匹配
    if dist < 0.3:  # 阈值
        return "success"
    else:
        return "fail"
```

**距离阈值说明**：

```
dist < 0.3  → 同一个人（高置信度）
0.3 < dist < 0.5  → 可能是同一个人
dist > 0.5  → 不同的人
```

## 微信小程序实现

### 1. 调用相机拍照

```javascript
Page({
  data: {
    camera: true,
  },

  onLoad() {
    this.setData({
      ctx: wx.createCameraContext(),
    })
  },

  // 拍照
  takePhoto() {
    let ctx = wx.createCameraContext(this)
    let that = this

    ctx.takePhoto({
      quality: "normal",
      success: (res) => {
        console.log(res.tempImagePath)
        // 上传到服务器
        that.uploadImage(res.tempImagePath)
      }
    })
  }
})
```

### 2. 人脸注册

```javascript
register() {
  let that = this

  wx.uploadFile({
    url: 'http://your-server:90/face_register',
    filePath: this.data.imagePath,
    name: 'file',
    header: { "Content-type": "multipart/form-data" },
    success: function (res) {
      if (res.data == "success") {
        that.setData({ register_res: "注册成功" })
      } else {
        that.setData({ register_res: "注册失败" })
      }
    }
  })
}
```

### 3. 人脸登录（循环检测）

```javascript
open() {
  let that = this
  let ctx = wx.createCameraContext(this)

  // 每 500ms 拍照一次，直到登录成功
  this.timer = setInterval(function () {
    ctx.takePhoto({
      quality: "normal",
      success: (res) => {
        wx.uploadFile({
          url: 'http://your-server:90/face_login',
          filePath: res.tempImagePath,
          name: 'file',
          success: function (res) {
            if (res.data == "success") {
              clearInterval(that.timer)  // 停止检测
              that.setData({ login_res: "登录成功" })
            }
          }
        })
      }
    })
  }, 500)
}
```

### 4. 绘制人脸框

```javascript
drawFaceBox(imagePath, bbox) {
  let myCanvas = wx.createCanvasContext("myCanvas")

  // 绘制图片
  myCanvas.drawImage(imagePath, 0, 0, windowWidth, windowHeight * 0.6)

  // 绘制人脸框
  myCanvas.setStrokeStyle("red")
  myCanvas.setLineWidth(5)
  myCanvas.rect(bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1])
  myCanvas.stroke()
  myCanvas.draw()
}
```

## 技术亮点

### 1. 模型服务化

将 TensorFlow 模型封装为 Flask API，实现模型与业务解耦：

```python
# 模型加载一次，多次调用
detection_sess = tf.Session()  # 全局 Session
face_feature_sess = tf.Session()

@app.route("/face_detect")
def face_detect():
    # 直接使用已加载的 Session
    output = detection_sess.run(...)
```

### 2. 特征向量存储

将 128 维特征向量序列化存储，便于扩展：

```python
# 存储
feature_str = ",".join(str(i) for i in emb[0])
with open("face/feature.txt", "w") as f:
    f.write(feature_str)

# 读取
emb = [float(s) for s in feature_str.split(",")]
```

**生产环境建议**：使用数据库或向量搜索引擎（如 Elasticsearch、Milvus）存储。

### 3. 实时人脸登录

小程序端循环拍照检测，实现「刷脸登录」体验：

```javascript
setInterval(() => {
  takePhoto() → upload() → check result
}, 500)
```

## 踩坑记录

### 问题 1：TensorFlow 版本兼容

**现象**：TensorFlow 2.x 无法直接加载 1.x 的 frozen graph。

**解决**：使用兼容 API

```python
# TensorFlow 2.x 兼容写法
import tensorflow as tf
tf.compat.v1.disable_eager_execution()

sess = tf.compat.v1.Session()
tf.compat.v1.get_default_graph()
```

### 问题 2：人脸检测坐标转换

**现象**：检测模型输出的是归一化坐标（0-1），需要转换为像素坐标。

**解决**：

```python
# 归一化坐标 → 像素坐标
y1 = int(bbox[0] * image_height)
x1 = int(bbox[1] * image_width)
y2 = int(bbox[2] * image_height)
x2 = int(bbox[3] * image_width)
```

### 问题 3：小程序跨域问题

**现象**：小程序无法请求本地 IP 的接口。

**解决**：
1. 开发时：关闭「不校验合法域名」
2. 生产时：部署 HTTPS + 配置合法域名

## 项目价值

### 业务价值

**对医学奖颁奖典礼**：
- 提升嘉宾签到体验，无需排队等待
- 增强活动科技感，彰显生命科学领域的创新精神
- 签到数据实时统计，便于会务管理

**技术储备价值**：
- 验证人脸识别技术在线下会议场景的可行性
- 积累 AI 项目从开发到部署的全流程经验
- 为后续智慧园区、门禁系统等项目奠定基础

### 技术价值
- 完整的人脸识别系统架构（检测 → 特征提取 → 比对）
- TensorFlow 模型服务化最佳实践
- 微信小程序与 Python 后端联调方案
- 可复用的人脸注册/验证 API

## 写在最后

这个项目是为「中源协和生命医学奖」颁奖典礼做的技术储备。通过这个项目，我深刻体会到：**AI 技术的价值在于解决实际问题**。

人脸识别不再是高不可攀的技术，借助 FaceNet 等开源模型，普通开发者也能快速构建专业级应用。核心技术点：

1. **FaceNet**：将人脸映射到 128 维向量空间
2. **特征比对**：欧氏距离判断相似度（阈值 0.3）
3. **模型服务化**：Flask + TensorFlow 封装 API
4. **前端交互**：微信小程序相机 + Canvas
5. **实时检测**：循环拍照 + 异步比对

**生产环境优化方向**：
- 活体检测（防止照片/视频攻击）
- 多人脸批量识别
- 向量数据库加速搜索（Milvus/Elasticsearch）
- 边缘部署（TensorFlow Lite / ONNX）
- 人脸质量评估（光线、角度、遮挡）

掌握这些技术，你就能为各种线下场景构建专业级的人脸识别应用。
