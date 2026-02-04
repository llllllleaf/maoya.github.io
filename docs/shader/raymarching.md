# 光线行进(Raymarching)原理与实践

光线行进是一种强大的渲染技术，可以用数学公式生成复杂的 3D 图形。

## 效果说明

<iframe src="/demos/raymarching.html" width="100%" height="400" style="border: none; border-radius: 8px;"></iframe>

展示了光线行进渲染的基础场景：球体、立方体、圆环通过平滑并集融合，带有软阴影、环境光遮蔽和棋盘格地面。

## 核心概念

### SDF（Signed Distance Function）

SDF 返回空间中任意一点到最近表面的距离：
- 正值：在物体外部
- 负值：在物体内部
- 零值：在物体表面

```glsl
// 球体SDF
float sphereSDF(vec3 p, float radius) {
    return length(p) - radius;
}

// 立方体SDF
float boxSDF(vec3 p, vec3 size) {
    vec3 d = abs(p) - size;
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}
```

### 光线行进算法

从相机发射光线，沿光线方向逐步前进，直到碰到物体：

```glsl
float rayMarch(vec3 ro, vec3 rd) {
    float t = 0.0;  // 累计距离

    for (int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;  // 当前位置
        float d = sceneSDF(p); // 到最近表面的距离

        if (d < 0.001) break;  // 碰到物体
        if (t > 100.0) break;  // 超出范围

        t += d;  // 安全地前进这段距离
    }

    return t;
}
```

## 基础形状

```glsl
// 圆环
float torusSDF(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

// 圆柱
float cylinderSDF(vec3 p, float h, float r) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

// 平面
float planeSDF(vec3 p, vec3 n, float d) {
    return dot(p, n) + d;
}
```

## 组合操作

```glsl
// 并集
float opUnion(float d1, float d2) {
    return min(d1, d2);
}

// 交集
float opIntersection(float d1, float d2) {
    return max(d1, d2);
}

// 差集
float opSubtraction(float d1, float d2) {
    return max(d1, -d2);
}

// 平滑并集
float opSmoothUnion(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
}
```

## 计算法线

```glsl
vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
        sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
        sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
    ));
}
```

## 光照

```glsl
vec3 lighting(vec3 p, vec3 normal, vec3 lightPos) {
    vec3 lightDir = normalize(lightPos - p);

    // 漫反射
    float diffuse = max(dot(normal, lightDir), 0.0);

    // 环境光
    float ambient = 0.1;

    return vec3(ambient + diffuse);
}
```

## 完整示例

```glsl
uniform float iTime;
uniform vec2 iResolution;

float sceneSDF(vec3 p) {
    // 地面
    float ground = p.y + 1.0;

    // 动态球体
    vec3 spherePos = vec3(sin(iTime), 0.0, cos(iTime));
    float sphere = sphereSDF(p - spherePos, 0.5);

    // 立方体
    float box = boxSDF(p - vec3(0.0, 0.0, 0.0), vec3(0.3));

    return opSmoothUnion(
        opUnion(ground, sphere),
        box,
        0.3
    );
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // 相机设置
    vec3 ro = vec3(0.0, 1.0, -3.0);  // 相机位置
    vec3 rd = normalize(vec3(uv, 1.0));  // 光线方向

    // 光线行进
    float t = rayMarch(ro, rd);

    // 着色
    vec3 color = vec3(0.0);
    if (t < 100.0) {
        vec3 p = ro + rd * t;
        vec3 normal = calcNormal(p);
        color = lighting(p, normal, vec3(2.0, 2.0, -2.0));
    }

    fragColor = vec4(color, 1.0);
}
```

## 性能优化

1. **限制迭代次数** - 通常 64-128 次足够
2. **设置最大距离** - 超出范围提前退出
3. **使用 LOD** - 远处使用简化的 SDF

## 资源推荐

- [Shadertoy](https://www.shadertoy.com) - Shader 作品分享平台
- [Inigo Quilez](https://iquilezles.org) - SDF 大师的博客
- [The Book of Shaders](https://thebookofshaders.com) - Shader 入门教程
