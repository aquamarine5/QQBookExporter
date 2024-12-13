# QQBookExporter

## Setup

```bash
pnpm i
```

## 如何使用？

```bash
node exporter.js <bid> [<ignore-columns>] [<output-dir>]
```

- `bid`: QQ阅读BookID，如：`https://book.qq.com/book-detail/32856733` 中 `bid` 即为 `32856733`
- `ignore-columns`: 忽略抓取页面的cid值，以`,`分隔，或输入`-`取空值
- `output-dir`: 输出路径
