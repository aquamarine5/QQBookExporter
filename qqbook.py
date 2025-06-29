#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
QQ阅读导出器命令行工具
版本: 2.0.0
作者: aquamarine5
描述: 提供友好的命令行界面来导出QQ阅读图书为Markdown格式
"""

import os
import sys
import json
import subprocess
import tempfile
import logging
import traceback
from pathlib import Path
from functools import wraps
from contextlib import contextmanager
from typing import Optional, Dict, List, Union
from dataclasses import dataclass
import argparse

# 第三方库导入（如果可用）
try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.prompt import Prompt, Confirm
    from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn
    from rich.syntax import Syntax
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False

# 全局配置
EXPORTER_PATH = Path(r"D:\Tool\DIY\QQBookExporter")
EXPORTER_SCRIPT = EXPORTER_PATH / "exporter.js"
DEFAULT_OUTPUT_DIR = "out"

# 初始化控制台对象
if RICH_AVAILABLE:
    console = Console()
else:
    # 简单的控制台替代
    class SimpleConsole:
        def print(self, message, **kwargs):
            print(message)
    console = SimpleConsole()

@dataclass
class ExportResult:
    """导出结果数据类"""
    success: bool
    book_id: str
    output_dir: str
    message: str
    error: Optional[str] = None

class PathManager:
    """路径管理器"""
    def __init__(self):
        self.original_cwd = Path.cwd()
        self.script_path = Path(sys.argv[0]).resolve()
        self.script_dir = self.script_path.parent

    def normalize_path(self, path: str) -> Path:
        """标准化路径"""
        p = Path(path)
        return p if p.is_absolute() else self.original_cwd / p

    def resolve_path(self, path: str) -> Path:
        """将相对路径解析为绝对路径"""
        return self.normalize_path(path).resolve()

@contextmanager
def working_directory(path):
    """工作目录上下文管理器"""
    prev_cwd = Path.cwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(prev_cwd)

def error_handler(reraise=False):
    """错误处理装饰器"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                error_msg = f"""
错误类型: {type(e).__name__}
错误信息: {str(e)}
堆栈跟踪:
{traceback.format_exc()}
"""
                if RICH_AVAILABLE:
                    console.print(f"[red]执行错误[/red]")
                    console.print(Panel(error_msg, title="错误详情", border_style="red"))
                else:
                    console.print(f"执行错误: {error_msg}")
                
                logging.error(error_msg)
                if reraise:
                    raise
                return None
        return wrapper
    return decorator

def setup_logging(log_dir: Path = None):
    """配置日志系统"""
    if log_dir is None:
        log_dir = Path.cwd() / "logs"

    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / "qqbook.log"

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler()
        ]
    )

def get_platform_info():
    """获取平台相关信息"""
    return {
        'platform': sys.platform,
        'is_windows': sys.platform == 'win32',
        'is_linux': sys.platform.startswith('linux'),
        'is_mac': sys.platform == 'darwin',
        'python_version': sys.version,
        'encoding': sys.getfilesystemencoding()
    }

def ensure_platform_compatibility():
    """确保平台兼容性"""
    platform_info = get_platform_info()

    if platform_info['is_windows']:
        # Windows特定配置
        os.environ['PYTHONIOENCODING'] = 'utf-8'

def validate_book_id(book_id: str) -> bool:
    """验证书籍ID格式"""
    return book_id.isdigit() and len(book_id) > 0

def create_parser():
    """创建标准化的参数解析器"""
    parser = argparse.ArgumentParser(
        description='QQ阅读图书导出工具',
        add_help=False,
        formatter_class=argparse.RawTextHelpFormatter
    )
    
    parser.add_argument('-h', '--help', action='store_true',
                       help='显示帮助信息')
    parser.add_argument('-v', '--version', action='store_true',
                       help='显示版本信息')
    parser.add_argument("book_id", nargs='?', help="要导出的书籍ID")
    parser.add_argument("-i", "--ignore", 
                       help="要忽略的章节ID列表，用逗号分隔 (例如: 1,2,3)")
    parser.add_argument("-o", "--output", 
                       help="输出目录 (默认: ./out/<book_id>)")
    parser.add_argument("--verbose", action='store_true',
                       help="详细输出模式")
    
    # 内部使用参数（隐藏）
    parser.add_argument('--output-file', type=str, help=argparse.SUPPRESS)
    
    return parser

def get_help_text():
    """返回标准化的帮助信息"""
    return """
QQ阅读图书导出工具 v2.0.0
=========================

用途:
    将QQ阅读平台的图书导出为Markdown格式文件

参数说明:
---------
    book_id               要导出的书籍ID (必需)
    -h, --help            显示此帮助信息
    -v, --version         显示版本信息
    -i, --ignore IGNORE   要忽略的章节ID列表，用逗号分隔
    -o, --output OUTPUT   指定输出目录
    --verbose             启用详细输出模式

使用示例:
---------
1. 基本导出:
   qqbook 123456

2. 忽略特定章节:
   qqbook 123456 -i 1,2,3

3. 指定输出目录:
   qqbook 123456 -o "我的书籍"

4. 组合使用:
   qqbook 123456 -i 1,2,999 -o "自定义目录"

输出结构:
---------
    当前目录/
    └── out/
        └── [书籍ID]/
            ├── [章节ID]-[章节名].md
            ├── [章节ID]-[章节名].md
            └── ...

注意事项:
---------
- 首次使用需要手动登录QQ阅读网站
- 只能导出已购买或免费的章节
- 导出过程中请不要关闭浏览器窗口
- 程序会自动处理章节间的延迟以避免请求过频

技术支持:
---------
如遇问题，请检查：
1. Node.js 和相关依赖是否正确安装
2. QQBookExporter 路径是否正确: {0}
3. 是否具有输出目录的写入权限

版本信息: v2.0.0
作者: aquamarine5
""".format(EXPORTER_PATH)

def show_help(help_text: str, title: str = "使用帮助"):
    """显示格式化的帮助信息"""
    if RICH_AVAILABLE:
        syntax = Syntax(help_text, "markdown", theme="monokai", line_numbers=False)
        console.print(Panel(syntax, title=title, title_align="left", border_style="green"))
    else:
        print(f"\n{title}\n{'='*50}")
        print(help_text)

def show_version():
    """显示版本信息"""
    version_info = """
QQ阅读导出器 v2.0.0
==================
作者: aquamarine5
Python版本: {python_version}
平台: {platform}
编码: {encoding}
""".format(**get_platform_info())
    
    if RICH_AVAILABLE:
        console.print(Panel(version_info, title="版本信息", border_style="blue"))
    else:
        print(version_info)

def validate_environment() -> tuple[bool, str]:
    """验证运行环境"""
    # 检查Node.js
    try:
        result = subprocess.run(['node', '--version'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode != 0:
            return False, "Node.js 未安装或无法访问"
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False, "Node.js 未安装或无法访问"
    
    # 检查导出器脚本
    if not EXPORTER_SCRIPT.exists():
        return False, f"找不到导出器脚本: {EXPORTER_SCRIPT}"
    
    # 检查依赖
    package_json = EXPORTER_PATH / "package.json"
    if not package_json.exists():
        return False, f"找不到package.json: {package_json}"
    
    return True, "环境检查通过"

class QQBookExporter:
    """QQ阅读导出器主类"""
    
    def __init__(self, path_manager: PathManager):
        self.path_manager = path_manager
        self.logger = logging.getLogger(__name__)
    
    @error_handler(reraise=False)
    def export_book(self, book_id: str, ignore_chapters: List[str] = None, 
                   output_dir: str = None, verbose: bool = False) -> ExportResult:
        """导出图书"""
        self.logger.info(f"开始导出书籍: {book_id}")
        
        # 验证书籍ID
        if not validate_book_id(book_id):
            error_msg = f"无效的书籍ID: {book_id}"
            self.logger.error(error_msg)
            return ExportResult(False, book_id, "", error_msg, error_msg)
        
        # 构建输出路径
        if output_dir:
            output_path = self.path_manager.resolve_path(output_dir)
        else:
            output_path = self.path_manager.original_cwd / DEFAULT_OUTPUT_DIR / book_id
        
        # 确保输出目录存在
        output_path.mkdir(parents=True, exist_ok=True)
        
        # 构建命令参数
        cmd_args = ["node", str(EXPORTER_SCRIPT), book_id]
        
        # 添加忽略章节参数
        if ignore_chapters:
            cmd_args.append(",".join(ignore_chapters))
        else:
            cmd_args.append("-")
        
        # 添加输出目录参数
        cmd_args.append(str(output_path))
        
        # 显示导出信息
        if RICH_AVAILABLE:
            console.print(f"📚 开始导出书籍ID: [cyan]{book_id}[/cyan]")
            console.print(f"📁 输出目录: [green]{output_path}[/green]")
            if ignore_chapters:
                console.print(f"⏭️  忽略章节: [yellow]{','.join(ignore_chapters)}[/yellow]")
        else:
            console.print(f"开始导出书籍ID: {book_id}")
            console.print(f"输出目录: {output_path}")
            if ignore_chapters:
                console.print(f"忽略章节: {','.join(ignore_chapters)}")
        
        try:
            # 切换到导出器目录执行
            with working_directory(EXPORTER_PATH):
                if verbose:
                    self.logger.info(f"执行命令: {' '.join(cmd_args)}")
                
                # 执行导出命令
                if RICH_AVAILABLE:
                    with Progress(
                        SpinnerColumn(),
                        TextColumn("[progress.description]{task.description}"),
                    ) as progress:
                        task = progress.add_task("[green]正在导出...", total=None)
                        
                        result = subprocess.run(
                            cmd_args, 
                            check=True, 
                            capture_output=False,
                            text=True,
                            encoding='utf-8'
                        )
                else:
                    console.print("正在导出，请稍候...")
                    result = subprocess.run(
                        cmd_args, 
                        check=True, 
                        capture_output=False,
                        text=True,
                        encoding='utf-8'
                    )
            
            success_msg = f"导出完成！文件保存在: {output_path}"
            self.logger.info(success_msg)
            
            if RICH_AVAILABLE:
                console.print(f"✅ [green]{success_msg}[/green]")
            else:
                console.print(f"✅ {success_msg}")
            
            return ExportResult(True, book_id, str(output_path), success_msg)
            
        except subprocess.CalledProcessError as e:
            error_msg = f"导出失败: 进程返回码 {e.returncode}"
            self.logger.error(error_msg)
            
            if RICH_AVAILABLE:
                console.print(f"❌ [red]{error_msg}[/red]")
            else:
                console.print(f"❌ {error_msg}")
            
            return ExportResult(False, book_id, str(output_path), error_msg, str(e))
        
        except KeyboardInterrupt:
            error_msg = "用户取消操作"
            self.logger.warning(error_msg)
            
            if RICH_AVAILABLE:
                console.print(f"\n⚠️  [yellow]{error_msg}[/yellow]")
            else:
                console.print(f"\n⚠️  {error_msg}")
            
            return ExportResult(False, book_id, str(output_path), error_msg, "KeyboardInterrupt")

def interactive_mode():
    """交互式模式"""
    if RICH_AVAILABLE:
        console.print(Panel(
            "欢迎使用QQ阅读导出器交互模式",
            title="交互模式",
            border_style="blue"
        ))
        
        book_id = Prompt.ask("请输入书籍ID")
        ignore_chapters = Prompt.ask("要忽略的章节ID (用逗号分隔，留空跳过)", default="")
        output_dir = Prompt.ask("输出目录 (留空使用默认)", default="")
        
        use_verbose = Confirm.ask("启用详细输出?", default=False)
    else:
        print("\n=== QQ阅读导出器交互模式 ===")
        book_id = input("请输入书籍ID: ").strip()
        ignore_chapters = input("要忽略的章节ID (用逗号分隔，留空跳过): ").strip()
        output_dir = input("输出目录 (留空使用默认): ").strip()
        use_verbose = input("启用详细输出? (y/N): ").strip().lower() in ['y', 'yes']
    
    return {
        'book_id': book_id,
        'ignore_chapters': ignore_chapters.split(',') if ignore_chapters else None,
        'output_dir': output_dir if output_dir else None,
        'verbose': use_verbose
    }

def main():
    """主函数"""
    try:
        # 1. 初始化日志
        setup_logging()
        logger = logging.getLogger(__name__)
        
        # 2. 确保平台兼容性
        ensure_platform_compatibility()
        
        # 3. 解析参数
        parser = create_parser()
        args = parser.parse_args()
        
        # 4. 处理版本请求
        if args.version:
            show_version()
            return
        
        # 5. 处理帮助请求
        if args.help:
            show_help(get_help_text())
            return
        
        # 6. 验证环境
        env_valid, env_msg = validate_environment()
        if not env_valid:
            if RICH_AVAILABLE:
                console.print(f"[red]环境检查失败: {env_msg}[/red]")
            else:
                console.print(f"环境检查失败: {env_msg}")
            logger.error(f"环境检查失败: {env_msg}")
            sys.exit(1)
        
        logger.info("环境检查通过")
        
        # 7. 初始化路径管理
        path_manager = PathManager()
        
        # 8. 处理交互模式或命令行参数
        if not args.book_id:
            if sys.stdin.isatty():
                # 交互模式
                params = interactive_mode()
                book_id = params['book_id']
                ignore_chapters = params['ignore_chapters']
                output_dir = params['output_dir']
                verbose = params['verbose']
            else:
                if RICH_AVAILABLE:
                    console.print("[red]错误: 必须提供书籍ID[/red]")
                else:
                    console.print("错误: 必须提供书籍ID")
                show_help(get_help_text())
                sys.exit(1)
        else:
            book_id = args.book_id
            ignore_chapters = args.ignore.split(',') if args.ignore else None
            output_dir = args.output
            verbose = args.verbose
        
        # 9. 执行导出
        exporter = QQBookExporter(path_manager)
        
        with working_directory(path_manager.original_cwd):
            result = exporter.export_book(
                book_id=book_id,
                ignore_chapters=ignore_chapters,
                output_dir=output_dir,
                verbose=verbose
            )
        
        # 10. 处理结果
        if result and result.success:
            logger.info(f"导出成功: {result.message}")
            sys.exit(0)
        else:
            error_msg = result.error if result else "未知错误"
            logger.error(f"导出失败: {error_msg}")
            sys.exit(1)
            
    except KeyboardInterrupt:
        if RICH_AVAILABLE:
            console.print("\n[yellow]用户中断操作[/yellow]")
        else:
            console.print("\n用户中断操作")
        sys.exit(1)
    except Exception as e:
        error_msg = f"未处理的异常: {str(e)}"
        if RICH_AVAILABLE:
            console.print(f"[red]{error_msg}[/red]")
        else:
            console.print(error_msg)
        logging.error(error_msg)
        sys.exit(1)
    finally:
        # 清理操作
        logging.shutdown()

if __name__ == "__main__":
    main() 