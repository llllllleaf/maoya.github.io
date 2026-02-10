---
description: 深度学习图像分类实战，使用 CNN 和 ResNet 在 CIFAR-10 数据集上实现十分类任务
---

# CIFAR-10 图像分类入门实战

本文记录我学习深度学习图像分类的第一个实战项目 - CIFAR-10 十分类。通过这个经典数据集，掌握 CNN 和 ResNet 的核心原理。

## CIFAR-10 数据集

CIFAR-10 是机器学习领域最经典的图像分类数据集之一：

| 属性 | 值 |
|------|------|
| 图像尺寸 | 32x32 像素 |
| 颜色通道 | RGB 3通道 |
| 类别数量 | 10 类 |
| 训练集 | 50,000 张 |
| 测试集 | 10,000 张 |

**10个类别**：飞机、汽车、鸟、猫、鹿、狗、青蛙、马、船、卡车

## 项目结构

```
cifar10/
├── data/              # TFRecord 数据文件
├── model/             # CNN 模型保存
├── model-resnet/      # ResNet 模型保存
├── logdirs/           # CNN 训练日志
├── logdirs-resnet/    # ResNet 训练日志
├── readcifar10.py     # 数据读取与增强
├── train.py           # 训练脚本
├── resnet.py          # ResNet 网络定义
└── test.py            # 测试脚本
```

## 数据读取与增强

使用 TFRecord 格式存储数据，通过队列机制高效读取：

```python
def read(batchsize=64, type=1, no_aug_data=1):
    reader = tf.TFRecordReader()
    if type == 0:  # 训练集
        file_list = ["data/train.tfrecord"]
    if type == 1:  # 测试集
        file_list = ["data/test.tfrecord"]

    filename_queue = tf.train.string_input_producer(
        file_list, num_epochs=None, shuffle=True
    )
    _, serialized_example = reader.read(filename_queue)

    # 批量读取并打乱
    batch = tf.train.shuffle_batch(
        [serialized_example], batchsize,
        capacity=batchsize * 10,
        min_after_dequeue=batchsize * 5
    )

    # 解析特征
    feature = {
        'image': tf.FixedLenFeature([], tf.string),
        'label': tf.FixedLenFeature([], tf.int64)
    }
    features = tf.parse_example(batch, features=feature)

    # 图像解码
    img_batch = tf.decode_raw(features["image"], tf.uint8)
    img_batch = tf.reshape(img_batch, [batchsize, 32, 32, 3])
```

### 数据增强

训练时对图像进行随机变换，提升模型泛化能力：

```python
if type == 0 and no_aug_data == 1:
    # 随机裁剪
    distorted_image = tf.random_crop(img_batch, [batchsize, 28, 28, 3])
    # 随机对比度
    distorted_image = tf.image.random_contrast(distorted_image, 0.8, 1.2)
    # 随机色调
    distorted_image = tf.image.random_hue(distorted_image, max_delta=0.2)
    # 随机饱和度
    distorted_image = tf.image.random_saturation(distorted_image, 0.8, 1.2)
    img_batch = tf.clip_by_value(distorted_image, 0, 255)

# 归一化到 [-1, 1]
img_batch = tf.cast(img_batch, tf.float32) / 128.0 - 1.0
```

| 增强方法 | 参数 | 作用 |
|----------|------|------|
| random_crop | 28x28 | 位置不变性 |
| random_contrast | 0.8-1.2 | 光照适应 |
| random_hue | 0.2 | 颜色鲁棒性 |
| random_saturation | 0.8-1.2 | 饱和度适应 |

## CNN 网络结构

基础 CNN 模型使用 TF-Slim 构建：

```python
def model(image, keep_prob=0.8, is_training=True):
    batch_norm_params = {
        "is_training": is_training,
        "epsilon": 1e-5,
        "decay": 0.997,
        'scale': True,
        'updates_collections': tf.GraphKeys.UPDATE_OPS
    }

    with slim.arg_scope(
        [slim.conv2d],
        weights_initializer=slim.variance_scaling_initializer(),
        activation_fn=tf.nn.relu,
        weights_regularizer=slim.l2_regularizer(0.0001),
        normalizer_fn=slim.batch_norm,
        normalizer_params=batch_norm_params):

        # 卷积层组1：32通道
        net = slim.conv2d(image, 32, [3, 3], scope='conv1')
        net = slim.conv2d(net, 32, [3, 3], scope='conv2')
        net = slim.max_pool2d(net, [3, 3], stride=2, scope='pool1')

        # 卷积层组2：64通道
        net = slim.conv2d(net, 64, [3, 3], scope='conv3')
        net = slim.conv2d(net, 64, [3, 3], scope='conv4')
        net = slim.max_pool2d(net, [3, 3], stride=2, scope='pool2')

        # 卷积层组3：128通道
        net = slim.conv2d(net, 128, [3, 3], scope='conv5')
        net = slim.conv2d(net, 128, [3, 3], scope='conv6')
        net = slim.max_pool2d(net, [3, 3], stride=2, scope='pool3')

        # 卷积层4：256通道
        net = slim.conv2d(net, 256, [3, 3], scope='conv7')

        # 全局平均池化
        net = tf.reduce_mean(net, axis=[1, 2])
        net = slim.flatten(net)

        # 全连接层
        net = slim.fully_connected(net, 1024)
        net = slim.dropout(net, keep_prob)
        net = slim.fully_connected(net, 10)  # 10分类

    return net
```

### 网络结构图

```
输入: 32x32x3
    ↓
Conv 3x3, 32 → Conv 3x3, 32 → MaxPool 2x2
    ↓
Conv 3x3, 64 → Conv 3x3, 64 → MaxPool 2x2
    ↓
Conv 3x3, 128 → Conv 3x3, 128 → MaxPool 2x2
    ↓
Conv 3x3, 256 → Global Average Pool
    ↓
FC 1024 → Dropout → FC 10
    ↓
输出: 10维分类向量
```

## ResNet 残差网络

为了获得更好的效果，引入 ResNet 残差结构：

```python
def resnet_blockneck(net, numout, down, stride, is_training):
    """残差块"""
    shortcut = net

    # 通道数不匹配时，用1x1卷积调整
    if numout != net.get_shape().as_list()[-1]:
        shortcut = slim.conv2d(net, numout, [1, 1])

    # 下采样
    if stride != 1:
        shortcut = slim.max_pool2d(shortcut, [3, 3], stride=stride)

    # 瓶颈结构：1x1降维 → 3x3卷积 → 1x1升维
    net = slim.conv2d(net, numout // down, [1, 1])
    net = slim.conv2d(net, numout // down, [3, 3])
    net = slim.conv2d(net, numout, [1, 1])

    if stride != 1:
        net = slim.max_pool2d(net, [3, 3], stride=stride)

    # 残差连接
    net = net + shortcut

    return net
```

### ResNet 完整结构

```python
def model_resnet(net, keep_prob=0.5, is_training=True):
    # 初始卷积
    net = slim.conv2d(net, 64, [3, 3], activation_fn=tf.nn.relu)
    net = slim.conv2d(net, 64, [3, 3], activation_fn=tf.nn.relu)

    # 残差块组
    net = resnet_blockneck(net, 128, 4, 2, is_training)  # 下采样
    net = resnet_blockneck(net, 128, 4, 1, is_training)
    net = resnet_blockneck(net, 256, 4, 2, is_training)  # 下采样
    net = resnet_blockneck(net, 256, 4, 1, is_training)
    net = resnet_blockneck(net, 512, 4, 2, is_training)  # 下采样
    net = resnet_blockneck(net, 512, 4, 1, is_training)

    # 分类头
    net = tf.reduce_mean(net, [1, 2])
    net = slim.flatten(net)
    net = slim.fully_connected(net, 1024, activation_fn=tf.nn.relu)
    net = slim.dropout(net, keep_prob)
    net = slim.fully_connected(net, 10, activation_fn=None)

    return net
```

## 损失函数

使用交叉熵损失 + L2 正则化：

```python
def loss(logits, label):
    # One-hot 编码
    one_hot_label = slim.one_hot_encoding(label, 10)

    # 交叉熵损失
    slim.losses.softmax_cross_entropy(logits, one_hot_label)

    # L2 正则化损失
    reg_set = tf.get_collection(tf.GraphKeys.REGULARIZATION_LOSSES)
    l2_loss = tf.add_n(reg_set)
    slim.losses.add_loss(l2_loss)

    # 总损失
    totalloss = slim.losses.get_total_loss()

    return totalloss, l2_loss
```

## 优化策略

使用 Adam 优化器 + 指数学习率衰减：

```python
def func_optimal(batchsize, loss_val):
    global_step = tf.Variable(0, trainable=False)

    # 指数衰减学习率
    lr = tf.train.exponential_decay(
        0.01,                          # 初始学习率
        global_step,
        decay_steps=50000 // batchsize,  # 每个epoch衰减
        decay_rate=0.95,               # 衰减率
        staircase=False
    )

    # 更新 BatchNorm 参数
    update_ops = tf.get_collection(tf.GraphKeys.UPDATE_OPS)
    with tf.control_dependencies(update_ops):
        op = tf.train.AdamOptimizer(lr).minimize(loss_val, global_step)

    return global_step, op, lr
```

| 超参数 | 值 | 说明 |
|--------|------|------|
| 初始学习率 | 0.01 | Adam 优化器 |
| 衰减率 | 0.95 | 每 epoch 衰减 |
| Batch Size | 64 | 批次大小 |
| Dropout | 0.8 | 防止过拟合 |
| L2 正则 | 0.0001 | 权重衰减 |

## 训练流程

```python
def train():
    batchsize = 64

    # 数据
    tr_im, tr_label = readcifar10.read(batchsize, 0, 1)  # 训练集+增强
    te_im, te_label = readcifar10.read(batchsize, 1, 0)  # 测试集

    # 占位符
    input_data = tf.placeholder(tf.float32, [None, 32, 32, 3])
    input_label = tf.placeholder(tf.int64, [None])
    keep_prob = tf.placeholder(tf.float32)
    is_training = tf.placeholder(tf.bool)

    # 网络
    logits = resnet.model_resnet(input_data, keep_prob, is_training)

    # 损失与优化
    total_loss, l2_loss = loss(logits, input_label)
    global_step, op, lr = func_optimal(batchsize, total_loss)

    # 准确率
    pred_max = tf.argmax(logits, 1)
    correct = tf.equal(pred_max, input_label)
    accuracy = tf.reduce_mean(tf.cast(correct, tf.float32))

    with tf.Session() as sess:
        # 初始化
        sess.run(tf.global_variables_initializer())
        tf.train.start_queue_runners(sess=sess)

        # 训练循环
        for i in range(50000 * 100):  # 100 epochs
            train_im_batch, train_label_batch = sess.run([tr_im, tr_label])

            feed_dict = {
                input_data: train_im_batch,
                input_label: train_label_batch,
                keep_prob: 0.8,
                is_training: True
            }

            _, step, loss_val, acc = sess.run(
                [op, global_step, total_loss, accuracy],
                feed_dict=feed_dict
            )

            if i % 100 == 0:
                print(f"Step {step}, Loss: {loss_val:.4f}, Acc: {acc:.4f}")
```

## 训练监控

使用 TensorBoard 监控训练过程：

```python
# 记录标量
tf.summary.scalar('train_loss', total_loss)
tf.summary.scalar('train_accuracy', accuracy)
tf.summary.scalar('learning_rate', lr)

# 记录图像
tf.summary.image('train_image', input_data * 128 + 128)

# 写入日志
summary_writer = tf.summary.FileWriter('logdirs', sess.graph)
summary_writer.add_summary(summary_str, global_step_val)
```

启动 TensorBoard：

```bash
tensorboard --logdir=logdirs
```

## 核心知识点

### 1. Batch Normalization

```python
batch_norm_params = {
    "is_training": is_training,  # 训练/推理模式
    "epsilon": 1e-5,             # 防止除零
    "decay": 0.997,              # 移动平均衰减
    'scale': True,               # 可学习缩放
    'updates_collections': tf.GraphKeys.UPDATE_OPS
}
```

### 2. 残差连接的意义

```
普通网络:  x → F(x)
残差网络:  x → F(x) + x
```

- 解决深层网络梯度消失问题
- 允许网络学习恒等映射
- 更容易优化

### 3. 全局平均池化

```python
net = tf.reduce_mean(net, axis=[1, 2])  # NHWC → NC
```

- 替代全连接层，减少参数
- 对空间位置求平均，增强平移不变性

## 实验结果

| 模型 | 测试准确率 | 参数量 |
|------|------------|--------|
| 基础 CNN | ~78% | ~1M |
| ResNet | ~85% | ~2M |

## 学习心得

1. **数据增强很重要** - 简单的裁剪、翻转就能提升几个百分点
2. **BatchNorm 是标配** - 加速收敛，稳定训练
3. **残差连接很有效** - 深层网络必备
4. **学习率调度** - 指数衰减比固定学习率效果好
5. **TensorBoard** - 可视化训练过程，及时发现问题

## 扩展方向

1. **更强的数据增强**：Cutout、Mixup、AutoAugment
2. **更深的网络**：ResNet-50、ResNet-101
3. **注意力机制**：SE-Net、CBAM
4. **知识蒸馏**：用大模型指导小模型
5. **迁移学习**：用 ImageNet 预训练权重

## 参考资源

- [CIFAR-10 数据集官网](https://www.cs.toronto.edu/~kriz/cifar.html)
- [Deep Residual Learning (ResNet 论文)](https://arxiv.org/abs/1512.03385)
- [TensorFlow Slim 文档](https://github.com/tensorflow/models/tree/master/research/slim)
