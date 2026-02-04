# Seascape 海洋着色器

本文学习实现一个逼真的海洋渲染效果，基于经典的 Shadertoy Seascape 着色器，核心技术包括 **光线行进（Ray Marching）**、**高度图追踪**、**多层波浪叠加** 和 **菲涅尔反射**。

## 效果说明

<iframe src="/demos/wave.html" width="100%" height="400" style="border: none; border-radius: 8px;"></iframe>

- 逼真的海洋波浪起伏
- 天空与海面的反射融合
- 基于菲涅尔的水面光照
- 自动相机漫游

## 核心原理

### 光线行进 vs 传统渲染

传统 3D 渲染使用三角形网格，而本效果使用 **光线行进** 技术：

```
传统渲染：顶点 → 三角形 → 光栅化 → 像素
光线行进：像素 → 发射光线 → 求交 → 着色
```

### 高度图追踪

海面使用高度图表示，通过二分查找追踪光线与海面的交点：

```glsl
float heightMapTracing(vec3 ori, vec3 dir, out vec3 p) {
    float tm = 0.0;
    float tx = 1000.0;
    float hx = map(ori + dir * tx);

    if (hx > 0.0) {
        p = ori + dir * tx;
        return tx;
    }

    float hm = map(ori + dir * tm);
    float tmid = 0.0;

    for (int i = 0; i < NUM_STEPS; i++) {
        tmid = mix(tm, tx, hm / (hm - hx));
        p = ori + dir * tmid;
        float hmid = map(p);

        if (hmid < 0.0) {
            tx = tmid;
            hx = hmid;
        } else {
            tm = tmid;
            hm = hmid;
        }
    }
    return tmid;
}
```

## 波浪生成

### 海浪 Octave 函数

波浪使用特殊的 octave 函数，模拟真实海浪的尖峰特征：

```glsl
float sea_octave(vec2 uv, float choppy) {
    uv += noise(uv);
    vec2 wv = 1.0 - abs(sin(uv));
    vec2 swv = abs(cos(uv));
    wv = mix(wv, swv, wv);
    return pow(1.0 - pow(wv.x * wv.y, 0.65), choppy);
}
```

### 多层波浪叠加

通过多次迭代叠加不同频率的波浪：

```glsl
float map(vec3 p) {
    float freq = SEA_FREQ;
    float amp = SEA_HEIGHT;
    float choppy = SEA_CHOPPY;
    vec2 uv = p.xz;

    float h = 0.0;
    float SEA_TIME = 1.0 + uTime * SEA_SPEED;

    for (int i = 0; i < ITER_GEOMETRY; i++) {
        float d = sea_octave((uv + SEA_TIME) * freq, choppy);
        d += sea_octave((uv - SEA_TIME) * freq, choppy);
        h += d * amp;

        uv *= octave_m;  // 旋转矩阵
        freq *= 1.9;
        amp *= 0.22;
        choppy = mix(choppy, 1.0, 0.2);
    }
    return p.y - h;
}
```

### 波浪参数说明

| 参数 | 值 | 作用 |
|------|------|------|
| SEA_HEIGHT | 0.6 | 波浪最大高度 |
| SEA_CHOPPY | 4.0 | 波浪尖锐程度 |
| SEA_SPEED | 0.8 | 波浪移动速度 |
| SEA_FREQ | 0.16 | 波浪基础频率 |
| octave_m | 旋转矩阵 | 每层波浪旋转避免规律感 |

## 光照与着色

### 菲涅尔效果

菲涅尔效应决定水面反射与折射的比例：

```glsl
vec3 getSeaColor(vec3 p, vec3 n, vec3 l, vec3 eye, vec3 dist) {
    // 菲涅尔系数 - 视角越平反射越强
    float fresnel = clamp(1.0 - dot(n, -eye), 0.0, 1.0);
    fresnel = pow(fresnel, 3.0) * 0.5;

    // 反射天空
    vec3 reflected = getSkyColor(reflect(eye, n));
    // 水体本色
    vec3 refracted = SEA_BASE + SEA_WATER_COLOR * 0.12;

    // 混合
    vec3 color = mix(refracted, reflected, fresnel);

    // 高光
    float spec = pow(max(dot(reflect(eye, n), l), 0.0), 60.0);
    color += vec3(spec);

    return color;
}
```

### 法线计算

通过有限差分计算海面法线：

```glsl
vec3 getNormal(vec3 p, float eps) {
    vec3 n;
    n.y = map_detailed(p);
    n.x = map_detailed(vec3(p.x + eps, p.y, p.z)) - n.y;
    n.z = map_detailed(vec3(p.x, p.y, p.z + eps)) - n.y;
    n.y = eps;
    return normalize(n);
}
```

### 天空渐变

简单但有效的天空颜色：

```glsl
vec3 getSkyColor(vec3 e) {
    e.y = (max(e.y, 0.0) * 0.8 + 0.2) * 0.8;
    return vec3(
        pow(1.0 - e.y, 2.0),      // R: 地平线偏暖
        1.0 - e.y,                 // G
        0.6 + (1.0 - e.y) * 0.4   // B: 天空偏蓝
    ) * 1.1;
}
```

## JavaScript 实现

### 全屏着色器设置

由于是纯片元着色器效果，使用全屏四边形渲染：

```javascript
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({
    vertexShader: `
        void main() {
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader,
    uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) }
    }
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    material.uniforms.uTime.value += 0.015;
    renderer.render(scene, camera);
}
animate();
```

### 相机自动漫游

在着色器中实现自动相机运动：

```glsl
// 相机角度 - 缓慢摆动
vec3 ang = vec3(
    sin(uTime * 0.1) * 0.1,
    sin(uTime * 0.05) * 0.05 + uTime * 0.1,
    0.0
);

// 相机位置 - 向前移动
vec3 ori = vec3(0.0, 3.5, uTime * 2.0);
```

## 渲染流程

```
1. 屏幕坐标 → UV 坐标
2. 计算相机位置和方向
3. 光线行进追踪海面
4. 计算海面法线
5. 计算菲涅尔反射/折射
6. 混合天空和海面颜色
7. 伽马校正输出
```

## 性能考虑

| 参数 | 建议值 | 说明 |
|------|--------|------|
| NUM_STEPS | 8 | 光线行进步数 |
| ITER_GEOMETRY | 3 | 几何计算迭代次数 |
| ITER_FRAGMENT | 5 | 法线计算迭代次数 |
| devicePixelRatio | max 2 | 限制像素比 |

## 扩展思路

1. **日落场景**：调整天空颜色和光源方向
2. **暴风雨**：增加 SEA_CHOPPY 和波浪高度
3. **雾效**：添加距离衰减
4. **船只**：叠加额外的 SDF 物体

## 小结

本文实现的 Seascape 海洋效果涉及：

- **光线行进** - 基于像素的渲染方式
- **高度图追踪** - 高效的海面求交
- **多层波浪叠加** - 真实的海浪形态
- **菲涅尔效应** - 物理正确的水面反射
- **自动漫游** - 相机缓慢移动和摆动

这种基于光线行进的海洋渲染效果非常适合作为网站背景、产品展示页或创意项目的视觉元素。
