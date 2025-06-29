# QQBook导出器使用说明 v2.0.0

基于Python最佳实践重构的QQ阅读图书导出工具。

## 🚀 新功能特性

### v2.0.0 新增功能
- ✅ **交互式模式**: 无参数启动进入友好的交互模式
- ✅ **Rich美化界面**: 支持彩色输出、进度条、面板等美观界面
- ✅ **完善的错误处理**: 详细的错误信息和日志记录
- ✅ **环境检查**: 自动验证Node.js和依赖环境
- ✅ **详细输出模式**: `--verbose` 参数显示详细执行信息
- ✅ **版本信息**: `--version` 显示详细版本和平台信息
- ✅ **日志系统**: 自动记录操作日志便于故障排除
- ✅ **路径智能处理**: 支持相对路径和绝对路径自动转换

## 📦 安装

### 自动安装（推荐）
```bash
python install.py
```

### 手动安装
1. 复制 `qqbook.py` 到 `D:\Tool\DIY\`
2. 复制 `qqbook.bat` 到 `D:\Tool\DIY\`
3. 确保 `D:\Tool\DIY` 在您的 PATH 环境变量中

### 安装验证
```bash
qqbook --version
qqbook --help
```

## 🎯 使用方法

### 基本用法

```bash
# 最简单的用法 - 导出书籍到默认位置
qqbook 123456

# 这会创建: ./out/123456/ 目录并保存所有章节
```

### 交互模式（推荐新手使用）

```bash
# 无参数启动，进入友好的交互模式
qqbook

# 程序会引导您输入：
# - 书籍ID
# - 要忽略的章节（可选）
# - 输出目录（可选）
# - 是否启用详细输出
```

### 命令行模式

```bash
# 忽略特定章节
qqbook 123456 -i 1,2,3

# 指定输出目录
qqbook 123456 -o "我的书籍"

# 组合使用所有选项
qqbook 123456 -i 1,2,999 -o "自定义目录" --verbose

# 查看详细帮助
qqbook --help

# 查看版本信息
qqbook --version
```

### 高级选项

| 参数 | 说明 | 示例 |
|------|------|------|
| `book_id` | 书籍ID（必需） | `123456` |
| `-i, --ignore` | 忽略的章节ID列表 | `-i 1,2,3` |
| `-o, --output` | 输出目录 | `-o "我的书籍"` |
| `--verbose` | 详细输出模式 | `--verbose` |
| `-h, --help` | 显示帮助信息 | `--help` |
| `-v, --version` | 显示版本信息 | `--version` |

## 📁 输出结构

### 默认结构
```
当前目录/
└── out/
    └── [书籍ID]/
        ├── [章节ID]-[章节名].md
        ├── [章节ID]-[章节名].md
        └── ...
```

### 自定义输出目录
```bash
# 指定输出到"我的书籍"目录
qqbook 123456 -o "我的书籍"

# 结果:
我的书籍/
├── [章节ID]-[章节名].md
├── [章节ID]-[章节名].md
└── ...
```

## 🛠️ 故障排除

### 命令找不到

**问题**: `bash: qqbook: command not found`

**解决方案**:

1. **重启终端** (最常见解决方案)
   ```bash
   # 关闭当前终端，重新打开
   ```

2. **使用绝对路径**
   ```bash
   D:\Tool\DIY\qqbook.bat 123456
   ```

3. **直接运行Python脚本**
   ```bash
   python D:\Tool\DIY\qqbook.py 123456
   ```

4. **手动刷新PATH** (PowerShell)
   ```powershell
   $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
   ```

### 环境问题

**问题**: 环境检查失败

**解决方案**:
1. 确保 Node.js 已安装: `node --version`
2. 检查QQBookExporter路径是否正确
3. 运行环境检查: `qqbook --help`

### 导出失败

**问题**: 导出过程中出现错误

**解决方案**:
1. 使用详细模式查看错误: `qqbook 123456 --verbose`
2. 检查日志文件: `./logs/qqbook.log`
3. 确认书籍ID是否正确
4. 检查网络连接和QQ阅读登录状态

## 📊 使用示例

### 基础示例

```bash
# 导出《三体》系列
qqbook 123456

# 导出时忽略前言和后记
qqbook 123456 -i 1,999

# 导出到指定目录
qqbook 123456 -o "D:\Books\科幻小说"
```

### 批量操作示例

```bash
# 导出多本书到同一目录
qqbook 123456 -o "我的图书馆"
qqbook 789012 -o "我的图书馆"
qqbook 345678 -o "我的图书馆"
```

### 完整工作流示例

```bash
# 1. 检查环境
qqbook --version

# 2. 查看帮助了解参数
qqbook --help

# 3. 使用交互模式（推荐）
qqbook

# 4. 或直接命令行模式
qqbook 123456 -i 1,2,999 -o "我的收藏" --verbose
```

## 🔧 技术细节

### 系统要求
- Python 3.7+
- Node.js (用于运行原始导出器)
- Windows 10+ (当前版本)

### 依赖检查
程序会自动检查以下依赖：
- Node.js 可执行性
- QQBookExporter 脚本存在性
- package.json 配置文件
- 输出目录写入权限

### 日志系统
- 自动创建日志目录: `./logs/`
- 主日志文件: `./logs/qqbook.log`
- 安装日志: `./logs/install.log`

### Rich界面支持
如果系统安装了 `rich` 库，程序会自动启用美化界面：
```bash
pip install rich
```

如果没有安装，程序会自动降级到简单文本界面，功能不受影响。

## 📝 注意事项

### 重要提醒
1. **首次使用需要手动登录QQ阅读网站**
2. **只能导出已购买或免费的章节**
3. **导出过程中请不要关闭浏览器窗口**
4. **程序会自动处理章节间延迟，避免请求过频**

### 最佳实践
1. 使用交互模式进行复杂配置
2. 启用详细模式排查问题
3. 定期检查日志文件
4. 使用有意义的输出目录名称

### 性能提示
- 大部头小说建议分批导出
- 使用SSD存储提高写入速度
- 确保有足够的磁盘空间

## 🆘 获取帮助

### 内置帮助
```bash
qqbook --help          # 完整帮助信息
qqbook --version       # 版本和环境信息
```

### 日志分析
```bash
# 查看最近的日志
cat ./logs/qqbook.log

# 在Windows中查看日志
type .\logs\qqbook.log
```

### 环境诊断
```bash
# 检查Python环境
python --version

# 检查Node.js环境
node --version

# 检查文件权限（PowerShell）
Test-Path "D:\Tool\DIY\qqbook.py"
```

---

**版本**: v2.0.0  
**更新时间**: 2024  
**作者**: aquamarine5  
**基于**: Python最佳实践指南重构 