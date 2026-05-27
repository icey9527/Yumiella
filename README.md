# 语录静态站雏形

这是一个零构建依赖的静态站原型，适合直接部署到 GitHub Pages。

## 文件

- `index.html`：前台展示页
- `editor.html`：本地 JSON 编辑器
- `data/quotes.json`：语录数据

## 数据格式

```json
[
  {
    "id": "v01-p023-001",
    "jp": "日文原文",
    "zh": "中文译文",
    "volume": 1,
    "page": 23
  }
]
```

`id` 可省略，页面和编辑器会自动补全。

## 本地预览

```bash
npm run serve
```

然后访问：

- `http://localhost:4173/index.html`
- `http://localhost:4173/editor.html`

## GitHub Pages

直接把这些文件推到仓库根目录即可。
