# ZenReader — 极致沉浸的本地私有阅读器（AI 伴读 / EPUB / PDF / 开源免费）

> 📖 **你的私人阅读空间。无账号、无云端、零泄漏，完全由你掌控。**

ZenReader 是一款基于 **纯前端 + 本地文件系统** 的现代阅读器。  
它轻量、美观、极简，支持 AI 伴读、EPUB/PDF/OCR、多主题、多语言解释等高级功能。

你只需打开它，无需安装、无需注册、无需后台服务 ——  
**只用浏览器，就能拥有专业级的沉浸阅读体验。**

---

## ✨ 功能特性

### 🌐 1. 纯静态但功能强大

* 无需后端，无需服务器  
* 所有数据本地处理，不上传任何信息  
* 放在 GitHub Pages / Vercel 即可运行

### 🤖 2. AI 伴读（智能术语解释）

* 自动识别文本中的 **专业名词**  
* 虚线高亮显示  
* **悬停/点击 → 显示词义、注释、延伸解释**  
* 支持 **中英文双语解释切换**  
* 可开启/关闭，完全可控  
* 不乱标、不干扰阅读，只解释真正的专业术语

### 📚 3. 现代阅读体验

* 支持 EPUB / PDF / 文本  
* 自适应移动端  
* 上/下双栏阅读工具条（自动隐藏）  
* 字体、主题、亮度、行距可全部自定义  
* 轻量动效，沉浸流畅  
* 夜间模式 / 纸张风格主题

### 🎛 5. 简洁极致的 UI（Minimal + Modern + Tech）

* 极简留白  
* 柔和灰阶  
* 扁平卡片  
* 真正的“读书工具感”，低噪音、干净不浮躁

---

## 🚀 快速开始

### **方式 1：直接访问网页（推荐）**

[[https://zenreader.your-domain.com](https://zenreader.your-domain.com)](https://zen-reader.vercel.app)


打开即用，无需安装、无需注册。

---

### **方式 2：本地运行（开发者）**

```bash
git clone https://github.com/you/zenreader.git
cd zenreader
npm install
npm run dev
````

---

## 🤖 AI 伴读示例

* 识别词汇：`向量数据库` `主题模型` `长时记忆窗口`
* 显示方式：虚线高亮
* 交互：悬停/点击 → Tooltip 弹出解释
* 语言：

  * 中文解释
  * 英文解释
  * 自动语言（跟随文章）

示例 JSON：

```json
{
  "term": "向量数据库",
  "definition_zh": "一种用于向量相似度检索的数据库，常用于嵌入搜索。",
  "definition_en": "A database designed for vector similarity search, used with embedding models."
}
```

---

## 📱 移动端体验

* 完整自适应
* 大触控热区
* 安全区适配（iPhone 全面屏）
* 单击页面呼出/隐藏上下工具栏
* 完全沉浸式阅读体验

---

## 🧱 项目架构

* **Vite + React + TypeScript**
* **File System Access API**（本地读写授权）
* **PDF.js / EPUB.js**（渲染引擎）
* **TailwindCSS**（现代 UI）
* **可扩展 AI 后端**（可接任意 LLM，包括本地模型）

---

## 📌 开发计划（Roadmap）

* [ ] 多端同步（基于本地目录 + 同步盘）
* [ ] AI 笔记理解（自动总结当前章节）
* [ ] 多语言 OCR
* [ ] 插件系统（词典插件 / 翻译插件）
* [ ] 离线 PWA 支持
* [ ] 字体管理（用户自定义字体）
* [ ] 支持本地 LLM（WebGPU 运行）

---

## 🤝 贡献

欢迎 PR / Issue / Feature Request！

如果你想一起做一个真正优雅的阅读器，非常欢迎联系我。

---

## ❤️ 支持项目

如果你喜欢 ZenReader，欢迎点个 ⭐ **Star** 鼓励我继续开发！

```
```
