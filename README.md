# QQBookExporter

[![wakatime](https://wakatime.com/badge/github/aquamarine5/QQBookExporter.svg)](https://wakatime.com/badge/github/aquamarine5/QQBookExporter)

## 功能

- 将 QQ 阅读的书籍导出为格式优美的 Markdown 文件。
- 保留原有的标题、加粗、列表、图片等格式。
- 自动跳过付费章节（除非已购买）。
- 支持忽略指定章节。

## Setup

```bash
pnpm i
```

> [!TIP]
> 如果不使用 `pnpm` ，也可输入以下命令来安装依赖。
>
> ```bash
> npm i
> ```

> [!NOTE]
> QQBookExporter 使用 `puppeteer-core` 并默认指向 Windows 上的 Edge 浏览器，可以自行更改 `executablePath` 来指定浏览器。

## 如何使用？

```bash
node exporter.js <bid> [<ignore-chapters>] [<output-dir>]
```

- `bid`: QQ阅读`BookID`，如：`https://book.qq.com/book-detail/53350666` 中 `bid` 即为 `53350666`
- `ignore-chapters`: 忽略抓取页面的cid值，以`,`分隔，或输入`-`取空值
- `output-dir`: 输出路径

### Example

```bash
node exporter.js 53350666 1,2 output
```

- 首先，`puppeteer`会打开 [https://book.qq.com/book-detail/53350666](https://book.qq.com/book-detail/53350666) 页面，用户在此页面进行账号登录，以抓取需要登录才能阅读的内容（包括已购买的付费章节）。
- 登录完成后，关闭当前选项卡页，随后 `QQBookExporter` 会自动开始抓取电子书内容并以 Markdown 格式保存在 `output-dir` 指定的目录下，默认是 `output/<bid>/`。
- 文件命名格式为 `${chapter.cid}-${chapter.chapterName}.md`。
- 因为 `ignore-chapters` 设置为 `1,2` ，并不会捕捉 `cid` 为 1 和 2 的章节（通常是封面、版权内容）。

## LICENSE

- `QQBookExporter` 通过 `LGPLv2.1` 进行开源。
- `QQBookExporter` 与 QQ阅读（book.qq.com）无关。
