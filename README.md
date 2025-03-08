# QQBookExporter

[![wakatime](https://wakatime.com/badge/github/aquamarine5/QQBookExporter.svg)](https://wakatime.com/badge/github/aquamarine5/QQBookExporter)

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

- `bid`: QQ阅读`BookID`，如：`https://book.qq.com/book-detail/32856733` 中 `bid` 即为 `53350666`
- `ignore-chapters`: 忽略抓取页面的cid值，以`,`分隔，或输入`-`取空值
- `output-dir`: 输出路径

### Example

```bash
node exporter.js 53350666 1,2 output
```

- 首先，`puppeteer`会打开 [https://book.qq.com/book-detail/32856733](https://book.qq.com/book-detail/53350666) 页面，用户在此页面进行账号登录，以抓取收费内容。
- 登录完成后，关闭当前选项卡页，随后 `QQBookExporter` 会自动开始抓取电子书内容并以TXT格式保存在 `output\${chapter-index}-${chapter-name}.txt` 下。
- 因为 `ignore-chapters` 设置为 `1,2` ，并不会捕捉第一第二章节（封面、版权内容）

> ![image.png](https://s2.loli.net/2024/12/14/N8aqb1gMU3jDI4C.png)  
> 输出文件目录

## LICENSE

- `QQBookExporter` 通过 `LGPLv2.1` 进行开源。
- `QQBookExporter` 与 QQ阅读（book.qq.com）无关。
