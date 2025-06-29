/*
 * @Author: aquamarine5 && aquamarine5_@outlook.com
 * Copyright (c) 2024 by @aquamarine5, RC. All Rights Reversed.
 */
import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { Browser } from "puppeteer-core";
import TurndownService from "turndown";

const DEFAULT_OUTPUT_DIR = "output"
const USER_DATA_DIR = path.join(process.cwd(), '.qqbook_user_data');

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
    
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`创建输出目录: ${outputDir}`);
    }
    const baseUrl = `https://book.qq.com/book-detail/${param}`;
    const browser = await puppeteer.launch({
        executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        headless: false,
        userDataDir: USER_DATA_DIR,
        defaultViewport: {
            width: 1920,
            height: 1080
        }
    });
    
    const page = await browser.newPage();
    console.log("正在检查登录状态...");
    await page.goto(baseUrl, { waitUntil: 'networkidle2' });

    // 使用一个通用选择器来查找登录链接/按钮
    const loginSelector = 'a[href*="login"]';

    try {
        await page.waitForSelector(loginSelector, { timeout: 5000 });
        // 如果选择器存在，说明用户未登录
        console.log("检测到您尚未登录，请在弹出的浏览器窗口中完成登录。");
        console.log("脚本将等待您登录，完成后会自动继续...");

        // 等待登录按钮消失，表示登录成功（最长等待3分钟）
        await page.waitForSelector(loginSelector, { hidden: true, timeout: 180000 });
        console.log("登录成功！继续执行导出任务。");
    } catch (error) {
        // 如果在超时时间内未找到登录按钮，则假定用户已登录
        console.log("检测到您已登录，将直接开始导出。");
    }
    
    await page.close(); // 关闭用于检查登录的页面

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
        const filePath = `${outputDir}/${filename}`.replace(/\\/g, '/');
        fs.writeFileSync(filePath, `${markdownContent}\n`, 'utf-8');
        console.log(`已保存: ${filename}`);
        await delay(500);
    }
    console.log('导出完成');
    await browser.close();
})();