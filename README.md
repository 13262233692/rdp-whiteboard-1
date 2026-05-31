# 协作白板 - 远程桌面实时标注系统

一个支持远程桌面嵌入和实时协作标注的Web端白板应用。

## 功能特性

- 🖊️ **白板标注**：基于Canvas的实时绘制功能，支持画笔、橡皮擦
- 🔄 **实时同步**：使用Socket.io实现多人标注实时同步
- 🖥️ **远程桌面**：通过WebSocket代理连接VNC服务器
- 👥 **协作功能**：支持多人同时在线，显示用户光标位置
- 🎨 **自定义画笔**：支持多种颜色和画笔大小

## 项目结构

```
rdp-whiteboard-1/
├── server/                 # 后端服务
│   ├── src/
│   │   ├── index.js       # 服务入口
│   │   ├── signaling.js   # Socket.io信令服务器
│   │   └── vnc-proxy.js   # VNC代理模块
│   ├── package.json
│   └── .env
└── client/                 # 前端应用
    ├── src/
    │   ├── components/
    │   │   ├── Whiteboard.jsx      # 白板组件
    │   │   ├── Toolbar.jsx         # 工具栏组件
    │   │   └── RemoteDesktop.jsx   # 远程桌面组件
    │   ├── pages/
    │   │   ├── Home.jsx   # 首页
    │   │   └── Room.jsx   # 房间页面
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── styles.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## 快速开始

### 1. 安装后端依赖

```bash
cd server
npm install
```

### 2. 安装前端依赖

```bash
cd client
npm install
```

### 3. 配置环境变量

在 `server/.env` 中配置VNC服务器：

```
PORT=3001
VNC_HOST=localhost
VNC_PORT=5900
```

### 4. 启动后端服务

```bash
cd server
npm start
```

### 5. 启动前端开发服务器

```bash
cd client
npm run dev
```

### 6. 访问应用

打开浏览器访问 `http://localhost:3000`

## 使用说明

### 创建/加入房间

1. 输入用户名
2. 点击"创建新房间"或输入房间号加入
3. 分享房间号给其他用户

### 白板标注

1. 点击左侧工具栏的 🖊️ 按钮启用白板
2. 选择画笔工具、颜色和大小
3. 在画布上绘制标注
4. 标注会实时同步给其他在线用户

### 远程桌面

1. 确保VNC服务器已启动
2. 在右侧面板点击连接VNC
3. 禁用白板模式可与远程桌面交互

## 技术栈

### 后端
- Node.js
- Express
- Socket.io (信令服务)
- ws (WebSocket VNC代理)

### 前端
- React 18
- Vite
- Socket.io-client
- Canvas API

## 核心模块说明

### 1. 信令服务器 (server/src/signaling.js)
- 管理房间和用户
- 处理白板标注同步
- 转发WebRTC信令消息

### 2. VNC代理 (server/src/vnc-proxy.js)
- WebSocket到TCP的代理转发
- 处理VNC协议数据传输
- 管理连接生命周期

### 3. 白板组件 (client/src/components/Whiteboard.jsx)
- Canvas绘制引擎
- 支持画笔和橡皮擦
- 坐标转换和边界处理

### 4. 实时同步
- 使用Socket.io房间机制
- 绘制操作即时广播
- 历史绘制数据持久化

## 开发说明

### 启动VNC服务器（可选）

如果需要测试远程桌面功能，需要启动VNC服务器：

**Windows:**
- 使用TightVNC或RealVNC
- 配置监听端口5900

**Linux:**
```bash
sudo apt-get install tightvncserver
vncserver :1
```

## 注意事项

1. 首次运行需要分别安装前后端依赖
2. VNC功能需要实际的VNC服务器支持
3. 建议使用现代浏览器（Chrome/Edge/Firefox）
4. 多人协作需要确保网络连通

## 许可证

MIT
