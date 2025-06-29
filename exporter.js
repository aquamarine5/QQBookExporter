/*
 * @Author: aquamarine5 && aquamarine5_@outlook.com
 * Copyright (c) 2024 by @aquamarine5, RC. All Rights Reversed.
 */
import puppeteer from "puppeteer-core";
import fs from "fs";
import { Browser } from "puppeteer-core";
import TurndownService from "turndown";

const DEFAULT_OUTPUT_DIR = "output"

/**
 * @param {Browser} browser 
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
 * @param {Browser} browser 
 * @param {number} bid 
 * @param {number} cid 
 * @returns {Promise<string>}
 */
async function getContent(browser, bid, cid) {
    const page = await browser.newPage();
    const url = `https://book.qq.com/book-read/${bid}/${cid}`;
    await page.goto(url, { timeout: 60000, waitUntil: 'networkidle2' });
    console.log(`已打开页面: ${url}`);
    const contentHTML = await page.evaluate(() => {
        if (window.__NUXT__?.data?.[0]?.currentContent?.content) {
            return window.__NUXT__.data[0].currentContent.content;
        }
        // Fallback if the NUXT object isn't found
        const contentElement = document.querySelector('.reader_content_area');
        if (contentElement) {
            const clone = contentElement.cloneNode(true);
            // Remove script tags to avoid including them in the markdown
            clone.querySelectorAll('script').forEach(s => s.remove());
            return clone.innerHTML;
        }
        return "<!-- Failed to extract content -->";
    });
    await page.close();
    return contentHTML;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('请提供全部参数');
        const browser = await puppeteer.launch({
            executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
            headless: false
        });
        return
    }
    const param = args[0];
    let ignoreColumn = args[1];
    let outputDir = args[2];
    let ignoreColumnIndex = []
    if (ignoreColumn && ignoreColumn != "-") {
        console.warn(`忽略章节: 空`);
        ignoreColumnIndex = ignoreColumn.split(",").map(item => parseInt(item))
    }

    if (!outputDir) {
        console.warn(`没有提供输出路径, 使用默认路径: ${DEFAULT_OUTPUT_DIR}/${param}`);
        outputDir = DEFAULT_OUTPUT_DIR + "/" + param;
    }
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const baseUrl = `https://book.qq.com/book-detail/${param}`;
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
    await new Promise(resolve => loginPage.on('close', resolve));
    const chapters = await getBookChapters(browser, param);
    console.log(chapters)
    const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
    for (let i = 0; i < chapters.length; i++) {
        const element = chapters[i];
        console.log(element);
        if (element.free == 0 && element.purchased == 0) {
            console.log(`跳过付费章节: ${element.cid}`);
            continue;
        }
        if (ignoreColumnIndex.includes(element.cid)) {
            console.log(`忽略章节: ${element.cid}`);
            continue;
        }

        const htmlContent = await getContent(browser, param, element.cid);
        let markdownContent = turndownService.turndown(htmlContent);

        const stopMarker = "◆参考书目";
        const stopIndex = markdownContent.indexOf(stopMarker);
        if (stopIndex !== -1) {
            markdownContent = markdownContent.substring(0, stopIndex);
        }

        var filename = `${element.cid}-${element.chapterName}.md`.replace(/ /g, "").replace(/\\/g, "").replace(/\//g, "");
        fs.writeFileSync(`${outputDir}\\${filename}`, `${markdownContent}\n`, 'utf-8');
        await delay(500);
    }
    console.log('导出完成');
    await browser.close();
})();