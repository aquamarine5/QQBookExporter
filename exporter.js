/*
 * @Author: aquamarine5 && aquamarine5_@outlook.com
 * Copyright (c) 2024-2025 by @aquamarine5, RC. All Rights Reversed.
 */
import puppeteer from "puppeteer-core";
import fs from "fs";
import axios from "axios";
import { Command } from "commander";

const DEFAULT_OUTPUT_DIR = "output"

/**
 * @param {import("puppeteer-core").Browser} browser 
 * @param {number} bookid 
 */
async function getBookChapters(browser, bookid) {
    const page = await browser.newPage();
    await page.goto(`https://book.qq.com/book-detail/${bookid}`, { waitUntil: 'networkidle2' });
    const response = await page.evaluate(async (bookid) => {
        try {
            const res = await fetch(`https://book.qq.com/api/book/detail/chapters?bid=${bookid}`);
            const data = await res.json();
            return data.data;
        } catch (error) {
            console.error('Failed to fetch chapters:', error);
            return null;
        }
    }, bookid);
    await page.close();
    return response;
}

/**
 * 
 * @param {import("puppeteer-core").Browser} browser 
 * @param {number} bid 
 * @param {number} cid 
 * @param {string} mode 
 * @param {string} outputDir 
 * @returns {Promise<string>}
 */
async function loadContent(browser, bid, cid, mode, outputDir) {
    const page = await browser.newPage();
    const url = `https://book.qq.com/book-read/${bid}/${cid}`;
    await page.goto(url, { timeout: 60000 });
    console.log(`已打开页面: ${url}`);
    try {
        await page.waitForResponse(response =>
            response.url().startsWith(url) && response.request().method() === 'POST', { timeout: 10000 });
    } catch (error) {
        if (error.name === "TimeoutError") {
            console.error("加载错误，等待2秒后尝试读取文章内容。")
            await delay(2000);
        } else {
            throw error;
        }
    }
    if (mode === "txt") {
        let content = await getBookContentForText(page)
        await page.close();
        return content;
    } else if (mode === "markdown") {
        let content = await getBookContentForMarkdown(page, cid, outputDir)
        await page.close();
        return content;
    }
}

/**
 * 
 * @param {import("puppeteer-core").Page} page 
 * @returns {Promise<string>}
 */
async function getBookContentForText(page) {
    return await page.evaluate(() => {
        let pElements = document.querySelectorAll('p');
        let textContents = [];
        for (let i = 0; i < pElements.length; i++) {
            let p = pElements[i];
            let pText = p.textContent;
            if (pText == "◆参考书目") {
                return textContents.join("\n");
            }
            console.log(i)
            textContents.push(pText);
        }
        return textContents.join("\n");
    });
}

/**
 * 
 * @param {import("puppeteer-core").Page} page 
 * @param {number} cid 
 * @param {string} outputDir 
 * @returns {Promise<string>}
 */
async function getBookContentForMarkdown(page, cid, outputDir) {
    let result = await page.evaluate(cid => {
        let elements = document.getElementById("article").querySelectorAll('h1,p,div.bodyPic');
        let contents = []
        for (let i = 0; i < elements.length; i++) {
            let e = elements[i];
            if (e.tagName == "P") {
                let pContent = "";
                for (let child of e.childNodes) {
                    if (child.nodeType === Node.TEXT_NODE) {
                        if (e.classList.contains("content_110") || e.classList.contains("contentCR-1") || e.classList.contains("content3_100")) {
                            pContent += `## ${child.textContent}\n`
                        } else
                            pContent += child.textContent;
                    } else if (child.nodeType === Node.ELEMENT_NODE) {
                        if (child.classList.contains('italic') ||
                            child.nodeName === 'I' ||
                            child.nodeName === 'EM' ||
                            child.style.fontStyle === 'italic') {
                            pContent += `*${child.textContent}*`;
                        } else if (child.tagName.toLowerCase() === "span" && child.classList.contains("bold")) {
                            pContent += `**${child.textContent}**`
                        } else {
                            pContent += child.textContent;
                        }
                    }
                }

                if (pContent.includes("◆参考书目")) {
                    return contents
                }

                contents.push({
                    "text": pContent,
                    "image": null
                });
            }
            else if (e.tagName == "DIV" && e.className == "bodyPic") {
                let img = e.querySelector('img');
                let filename = img.src.split("/").pop().split("?")[0];
                let path = `images/${cid}/${filename}`;
                if (img) {
                    contents.push({
                        "text": `![${img.alt}](${path})`,
                        "image": {
                            "src": img.src,
                            "path": path,
                            "dir": `images/${cid}`
                        }
                    });
                }
            } else if (e.tagName == "H1" && e.className == "firstTitle-1") {
                contents.push({
                    "text": `# ${e.textContent}\n`,
                    "image": null
                })
            } else if (e.tagName == "H1" && e.className == "secondTitle-1") {
                contents.push({
                    "text": `## ${e.textContent}\n`,
                    "image": null
                })
            } else if (e.tagName == "H1" && e.className == "frontCover") {
                let img = e.querySelector('img');
                let filename = img.src.split("/").pop().split("?")[0];
                let path = `images/${cid}/${filename}`;
                if (img) {
                    contents.push({
                        "text": `![${img.alt}](${path})`,
                        "image": {
                            "src": img.src,
                            "path": path,
                            "dir": `images/${cid}`
                        }
                    });
                }
            }
        }
        return contents
    }, cid)
    let text = ""
    for (const element of result) {
        if (element.image) {
            let img = element.image;
            fs.mkdirSync(`${outputDir}/${img.dir}`, { recursive: true });
            let response = await axios.get(img.src, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    "Referer": "https://book.qq.com/",
                    "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0`
                }
            })
            fs.writeFileSync(`${outputDir}/${img.path}`, response.data);
        }
        console.log(element)
        text += element.text + "\n";
    }
    return text
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    const mode2extension = {
        "txt": "txt",
        "markdown": "md"
    }
    const program = new Command()
    program.name("QQBookExporter")
        .version("1.3.0")
        .argument("<bookId>", "书籍ID")
        .option("-x, --ignore <chapters>", "要忽略的章节列表，以,分隔，或以-定义区间", "")
        .option("-o, --output <directory>", "输出目录", DEFAULT_OUTPUT_DIR)
        .option("-m, --mode <mode>", "导出模式（txt 或 markdown）", "markdown")
        .action(async (bookId, options) => {
            let ignoreText = options.ignore
            let ignoreChapters = []
            if (/^\d+,\d+$/.test(ignoreText)) {
                ignoreChapters = ignoreText.split(",").map(item => parseInt(item))
            } else if (/^\d+-\d+$/.test(ignoreText)) {
                const [start, end] = ignoreText.split('-').map(Number);
                for (let i = start; i <= end; i++) {
                    ignoreChapters.push(i);
                }
            } else if (/^\d+$/.test(ignoreText)) {
                ignoreChapters.push(parseInt(ignoreText))
            } else if (ignoreText == "") {
                ignoreChapters = []
            }
            else {
                console.error("ignore-chapters 输入格式错误。")
                return
            }
            let mode = options.mode
            let outputDir = options.output

            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            const baseUrl = `https://book.qq.com/book-detail/${bookId}`;
            const browser = await puppeteer.launch({
                executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
                headless: false,
                defaultViewport: {
                    width: 1920,
                    height: 1080
                }
            });
            const loginPage = await browser.newPage();
            await loginPage.goto(baseUrl);
            console.log(`打开书本页面：${baseUrl}，点击登录进行登录操作，然后关闭页面。`)
            await new Promise(resolve => loginPage.on('close', resolve));
            console.log("开始下载。")
            const chapters = await getBookChapters(browser, bookId);
            console.log(chapters)
            for (let i = 0; i < chapters.length; i++) {
                const element = chapters[i];
                console.log(element);
                if (element.free == 0 && element.purchased == 0) {
                    console.log(`跳过付费章节: ${element.cid}`);
                    //continue;
                }
                if (ignoreChapters.includes(element.cid)) {
                    console.log(`忽略章节: ${element.cid}`);
                    continue;
                }

                const content = await loadContent(browser, bookId, element.cid, mode, outputDir);
                var filename = `${element.cid}-${element.chapterName}.${mode2extension[mode]}`.replace(/[\\/]/g, "")
                fs.writeFileSync(`${outputDir}\\${filename}`, `${content}\n`, 'utf-8');
                await delay(500);
            }
            console.log('导出完成');
            await browser.close();
        })
    await program.parseAsync()
})()