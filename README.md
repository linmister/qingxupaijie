# 情绪排解 AI 助手

一个基于 React + TypeScript 的情绪排解 AI 助手应用，集成了豆包 API 和火山引擎 TTS 语音合成功能。

> 最后更新：2024年12月

## 功能特性

- 🎭 多种情感模式：受气包、抬杠、疗愈
- 🤖 AI对话功能（基于豆包API）
- 🔊 语音合成（基于火山引擎TTS）
- 📱 响应式设计，支持移动端

## 环境配置

### 1. 复制环境变量文件
```bash
cp .env.example .env
```

### 2. 配置API密钥
在 `.env` 文件中填入以下配置：

```env
# 豆包API配置
VITE_ARK_API_KEY=your_ark_api_key_here

# 火山引擎TTS配置
VITE_TTS_ACCESS_KEY=your_tts_access_key_here
VITE_TTS_APP_ID=your_app_id_here
```

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 部署说明

本项目使用GitHub Pages自动部署。当推送到master分支时，会自动触发构建和部署流程。

### GitHub Secrets配置

为了在GitHub Pages上正常使用API功能，需要在仓库设置中配置以下Secrets：

1. 进入仓库 Settings → Secrets and variables → Actions
2. 添加以下Repository secrets：
   - `VITE_ARK_API_KEY`: 豆包API密钥
   - `VITE_TTS_ACCESS_KEY`: 火山引擎TTS访问密钥
   - `VITE_TTS_APP_ID`: 火山引擎TTS应用ID

## 安全说明

- ✅ 所有敏感信息（API密钥）都通过环境变量管理
- ✅ `.env` 文件已被 `.gitignore` 忽略，不会提交到仓库
- ✅ GitHub Actions使用Repository Secrets安全传递环境变量
- ✅ 前端代码中没有硬编码任何敏感信息

## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React Icons