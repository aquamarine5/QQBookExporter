# QQBookExporter

[![wakatime](https://wakatime.com/badge/github/aquamarine5/QQBookExporter.svg)](https://wakatime.com/badge/github/aquamarine5/QQBookExporter)

## Setup

```bash
pnpm i
```

> [!NOTE]
> QQBookExporter 使用 puppeteer-core 并默认指向 Windows 上的 Edge 浏览器，可以自行更改 executablePath 来指定浏览器

## 如何使用？

```bash
node exporter.js <bid> [<ignore-columns>] [<output-dir>]
```

- `bid`: QQ阅读BookID，如：`https://book.qq.com/book-detail/32856733` 中 `bid` 即为 `32856733`
- `ignore-columns`: 忽略抓取页面的cid值，以`,`分隔，或输入`-`取空值
- `output-dir`: 输出路径
