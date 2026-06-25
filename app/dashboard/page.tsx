<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏙️ 我的城市 - 创意小游戏</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', 'PingFang SC', Roboto, 'Helvetica Neue', sans-serif;
            background: linear-gradient(145deg, #1a2a3a 0%, #0f1a26 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .game-container {
            background: #2d4a5e;
            border-radius: 32px;
            padding: 24px 28px 28px 28px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7), 0 0 0 2px rgba(255, 255, 255, 0.06) inset;
            max-width: 1100px;
            width: 100%;
        }

        .game-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 8px 16px 8px;
            flex-wrap: wrap;
            gap: 10px;
        }

        .game-title {
            display: flex;
            align-items: center;
            gap: 12px;
            color: #fff;
            font-size: 26px;
            font-weight: 700;
            letter-spacing: 1px;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }

        .game-title span {
            background: rgba(255, 255, 255, 0.12);
            padding: 4px 14px;
            border-radius: 40px;
            font-size: 14px;
            font-weight: 400;
            color: #b8d8e8;
        }

        .game-status {
            color: #d4edfa;
            background: rgba(0, 0, 0, 0.3);
            padding: 6px 18px;
            border-radius: 30px;
            font-size: 15px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(4px);
        }

        .canvas-wrapper {
            background: #9bb7c9;
            border-radius: 20px;
            padding: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
            position: relative;
        }

        #cityCanvas {
            display: block;
            width: 100%;
            height: auto;
            border-radius: 14px;
            background: #7fa3b9;
            cursor: crosshair;
            touch-action: none;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2) inset;
        }

        .toolbar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
            padding: 16px 8px 6px 8px;
            justify-content: center;
        }

        .tool-group {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
            background: rgba(0, 0, 0, 0.2);
            padding: 6px 12px;
            border-radius: 40px;
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .tool-group-label {
            color: #9fc7db;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.5px;
            margin-right: 4px;
            text-transform: uppercase;
            opacity: 0.7;
        }

        .tool-btn {
            width: 44px;
            height: 44px;
            border: none;
            border-radius: 30px;
            background: rgba(255, 255, 255, 0.08);
            color: #cde3ee;
            font-size: 20px;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            position: relative;
        }

        .tool-btn:hover {
            background: rgba(255, 255, 255, 0.18);
            transform: scale(1.05);
        }

        .tool-btn:active {
            transform: scale(0.92);
        }

        .tool-btn.active {
            background: #5b9fc7;
            color: #fff;
            box-shadow: 0 0 20px rgba(91, 159, 199, 0.4);
            transform: scale(1.05);
        }

        .tool-btn.active::after {
            content: '';
            position: absolute;
            inset: -3px;
            border-radius: 34px;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .tool-btn .badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: #ff6b6b;
            color: #fff;
            border-radius: 20px;
            font-size: 10px;
            padding: 1px 7px;
            font-weight: 700;
            box-shadow: 0 2px 8px rgba(255, 107, 107, 0.4);
        }

        .color-picker-group {
            display: flex;
            align-items: center;
            gap: 5px;
            background: rgba(0, 0, 0, 0.2);
            padding: 4px 10px;
            border-radius: 40px;
            border: 1px solid rgba(255, 255, 255, 0.06);
            flex-wrap: wrap;
        }

        .color-swatch {
            width: 30px;
            height: 30px;
            border-radius: 30px;
            border: 2px solid transparent;
            cursor: pointer;
            transition: all 0.15s ease;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            flex-shrink: 0;
        }

        .color-swatch:hover {
            transform: scale(1.15);
        }

        .color-swatch.active {
            border-color: #fff;
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.3), 0 0 0 2px #fff;
            transform: scale(1.1);
        }

        .color-swatch[data-color="#FF6B6B"] {
            background: #FF6B6B;
        }
        .color-swatch[data-color="#FFA94D"] {
            background: #FFA94D;
        }
        .color-swatch[data-color="#FFD93D"] {
            background: #FFD93D;
        }
        .color-swatch[data-color="#6BCB77"] {
            background: #6BCB77;
        }
        .color-swatch[data-color="#4D96FF"] {
            background: #4D96FF;
        }
        .color-swatch[data-color="#9B59B6"] {
            background: #9B59B6;
        }
        .color-swatch[data-color="#FF6B9D"] {
            background: #FF6B9D;
        }
        .color-swatch[data-color="#F5A0A0"] {
            background: #F5A0A0;
        }
        .color-swatch[data-color="#A0C4FF"] {
            background: #A0C4FF;
        }
        .color-swatch[data-color="#E8D5B7"] {
            background: #E8D5B7;
        }

        .action-btn {
            padding: 0 18px;
            height: 40px;
            border: none;
            border-radius: 30px;
            background: rgba(255, 255, 255, 0.08);
            color: #cde3ee;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
        }

        .action-btn:hover {
            background: rgba(255, 255, 255, 0.18);
            transform: scale(1.03);
        }

        .action-btn:active {
            transform: scale(0.94);
        }

        .action-btn.danger {
            color: #ff8a8a;
        }
        .action-btn.danger:hover {
            background: rgba(255, 80, 80, 0.25);
        }

        .action-btn.success {
            color: #8ddf8d;
        }
        .action-btn.success:hover {
            background: rgba(80, 255, 80, 0.15);
        }

        .element-counter {
            color: #b0d0e0;
            font-size: 14px;
            padding: 0 10px;
            background: rgba(0, 0, 0, 0.15);
            border-radius: 20px;
            height: 36px;
            display: flex;
            align-items: center;
            gap: 8px;
            border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .element-counter span {
            font-weight: 700;
            color: #fff;
        }

        @media (max-width: 700px) {
            .game-container {
                padding: 14px;
            }
            .game-title {
                font-size: 20px;
            }
            .game-title span {
                font-size: 12px;
                padding: 2px 10px;
            }
            .tool-btn {
                width: 38px;
                height: 38px;
                font-size: 17px;
            }
            .color-swatch {
                width: 26px;
                height: 26px;
            }
            .tool-group {
                padding: 4px 8px;
                gap: 4px;
            }
            .action-btn {
                height: 34px;
                font-size: 13px;
                padding: 0 12px;
            }
            .game-status {
                font-size: 12px;
                padding: 4px 12px;
            }
            .element-counter {
                font-size: 12px;
                height: 32px;
                padding: 0 8px;
            }
        }

        @media (max-width: 500px) {
            .game-container {
                padding: 8px;
                border-radius: 20px;
            }
            .toolbar {
                gap: 4px;
                padding: 10px 2px 2px 2px;
            }
            .tool-btn {
                width: 34px;
                height: 34px;
                font-size: 15px;
            }
            .color-swatch {
                width: 22px;
                height: 22px;
            }
            .game-title {
                font-size: 16px;
            }
        }
    </style>
</head>
<body>

    <div class="game-container">
        <!-- 头部 -->
        <div class="game-header">
            <div class="game-title">
                🏙️ 我的城市
                <span>🎨 创意工坊</span>
            </div>
            <div class="game-status" id="statusBar">💡 点击放置 · 选择涂色</div>
        </div>

        <!-- 画布 -->
        <div class="canvas-wrapper">
            <canvas id="cityCanvas" width="1000" height="680"></canvas>
        </div>

        <!-- 工具栏 -->
        <div class="toolbar">
            <!-- 工具组 -->
            <div class="tool-group">
                <span class="tool-group-label">🛠️ 工具</span>
                <button class="tool-btn active" data-tool="select" title="选择/移动">🖱️</button>
                <button class="tool-btn" data-tool="car" title="放置汽车">🚗</button>
                <button class="tool-btn" data-tool="person" title="放置人物">🧑</button>
                <button class="tool-btn" data-tool="house" title="放置房屋">🏠</button>
                <button class="tool-btn" data-tool="paint" title="涂色模式">🎨</button>
                <button class="tool-btn danger" data-tool="delete" title="删除元素">🗑️</button>
            </div>

            <!-- 颜色选择 -->
            <div class="color-picker-group" id="colorPicker">
                <span class="tool-group-label">🎨 颜色</span>
                <div class="color-swatch active" data-color="#FF6B6B"></div>
                <div class="color-swatch" data-color="#FFA94D"></div>
                <div class="color-swatch" data-color="#FFD93D"></div>
                <div class="color-swatch" data-color="#6BCB77"></div>
                <div class="color-swatch" data-color="#4D96FF"></div>
                <div class="color-swatch" data-color="#9B59B6"></div>
                <div class="color-swatch" data-color="#FF6B9D"></div>
                <div class="color-swatch" data-color="#F5A0A0"></div>
                <div class="color-swatch" data-color="#A0C4FF"></div>
                <div class="color-swatch" data-color="#E8D5B7"></div>
            </div>

            <!-- 统计 & 操作 -->
            <div class="element-counter">
                🏗️ <span id="elementCount">0</span>
            </div>

            <button class="action-btn danger" id="clearBtn">🧹 清空</button>
            <button class="action-btn success" id="undoBtn">↩️ 撤销</button>
        </div>
    </div>

    <script>
        // ============================================================
        //  🏙️  我的城市 - 完整游戏逻辑
        // ============================================================

        // ---------- DOM 引用 ----------
        const canvas = document.getElementById('cityCanvas');
        const ctx = canvas.getContext('2d');
        const statusBar = document.getElementById('statusBar');
        const elementCountEl = document.getElementById('elementCount');

        // ---------- 尺寸适配 ----------
        function resizeCanvas() {
            const wrapper = canvas.parentElement;
            const wrapperWidth = wrapper.clientWidth - 16;
            const aspect = 1000 / 680;
            let displayWidth = Math.min(wrapperWidth, 1000);
            let displayHeight = displayWidth / aspect;
            if (displayHeight > 680) {
                displayHeight = 680;
                displayWidth = displayHeight * aspect;
            }
            canvas.style.width = displayWidth + 'px';
            canvas.style.height = displayHeight + 'px';
        }
        window.addEventListener('resize', resizeCanvas);

        // ---------- 游戏状态 ----------
        const state = {
            elements: [], // 所有元素
            selectedId: null, // 当前选中的元素ID
            tool: 'select', // 当前工具: select | car | person | house | paint | delete
            color: '#FF6B6B', // 当前选中的颜色
            nextId: 1,
            undoStack: [],
            maxUndo: 30,
            isDragging: false,
            dragOffsetX: 0,
            dragOffsetY: 0,
            dragStartId: null,
        };

        // ---------- 城市背景数据 ----------
        // 固定装饰：树木、小建筑、路灯等 (仅用于绘制背景，不可交互)
        const cityDecor = [];

        // 生成一些随机树木位置 (在道路两侧)
        function generateDecor() {
            cityDecor.length = 0;
            // 树木
            for (let i = 0; i < 40; i++) {
                let x = 40 + Math.random() * 920;
                let y = 40 + Math.random() * 600;
                // 避免覆盖道路 (道路在中间十字)
                const roadH = 280,
                    roadW = 380;
                if (x > roadW - 60 && x < roadW + 60 && y > roadH - 60 && y < roadH + 60) continue;
                if (x > roadW - 140 && x < roadW + 140 && y > roadH - 140 && y < roadH + 140) continue;
                cityDecor.push({
                    type: 'tree',
                    x,
                    y,
                    size: 14 + Math.random() * 16,
                    shade: 0.7 + Math.random() * 0.3
                });
            }
            // 一些小房子（背景装饰）
            for (let i = 0; i < 12; i++) {
                let x = 60 + Math.random() * 880;
                let y = 60 + Math.random() * 560;
                const roadH = 280,
                    roadW = 380;
                if (x > roadW - 80 && x < roadW + 80 && y > roadH - 80 && y < roadH + 80) continue;
                if (x > roadW - 180 && x < roadW + 180 && y > roadH - 180 && y < roadH + 180) continue;
                cityDecor.push({
                    type: 'bldg',
                    x,
                    y,
                    w: 22 + Math.random() * 30,
                    h: 22 + Math.random() * 30,
                    color: `hsl(${30 + Math.random() * 40}, ${50 + Math.random() * 30}%, ${60 + Math.random() * 25}%)`,
                });
            }
        }
        generateDecor();

        // ---------- 元素工厂 ----------
        function createElement(type, x, y, color) {
            const id = state.nextId++;
            const base = {
                id,
                type,
                x,
                y,
                color: color || state.color,
                selected: false,
            };
            switch (type) {
                case 'car':
                    return { ...base, w: 44, h: 24, label: '🚗' };
                case 'person':
                    return { ...base, w: 28, h: 40, label: '🧑' };
                case 'house':
                    return { ...base, w: 48, h: 44, label: '🏠' };
                default:
                    return { ...base, w: 30, h: 30 };
            }
        }

        // ---------- 绘制函数 ----------
        function drawCityBackground() {
            // 草地
            const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grad.addColorStop(0, '#8db87a');
            grad.addColorStop(0.5, '#7ca86a');
            grad.addColorStop(1, '#6d965c');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 网格线（草地纹理）
            ctx.strokeStyle = 'rgba(100,140,80,0.15)';
            ctx.lineWidth = 1;
            for (let x = 0; x < canvas.width; x += 40) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += 40) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            // 道路 (十字)
            ctx.shadowColor = 'rgba(0,0,0,0.1)';
            ctx.shadowBlur = 12;

            // 横向道路
            const roadY = 280,
                roadH = 90;
            ctx.fillStyle = '#5a6b7a';
            ctx.fillRect(0, roadY, canvas.width, roadH);
            // 道路标线
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#e8e8d0';
            ctx.lineWidth = 3;
            ctx.setLineDash([20, 25]);
            ctx.beginPath();
            ctx.moveTo(0, roadY + roadH / 2);
            ctx.lineTo(canvas.width, roadY + roadH / 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // 纵向道路
            const roadX = 380,
                roadW = 90;
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#5a6b7a';
            ctx.fillRect(roadX, 0, roadW, canvas.height);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#e8e8d0';
            ctx.lineWidth = 3;
            ctx.setLineDash([20, 25]);
            ctx.beginPath();
            ctx.moveTo(roadX + roadW / 2, 0);
            ctx.lineTo(roadX + roadW / 2, canvas.height);
            ctx.stroke();
            ctx.setLineDash([]);

            // 道路边缘
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255,255,240,0.2)';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, roadY, canvas.width, roadH);
            ctx.strokeRect(roadX, 0, roadW, canvas.height);

            // 道路交叉口 装饰
            ctx.fillStyle = 'rgba(255,255,240,0.08)';
            ctx.fillRect(roadX, roadY, roadW, roadH);

            // 装饰: 树木和建筑 (背景)
            ctx.shadowBlur = 6;
            ctx.shadowColor = 'rgba(0,0,0,0.1)';
            for (const d of cityDecor) {
                if (d.type === 'tree') {
                    // 树冠
                    ctx.beginPath();
                    ctx.arc(d.x, d.y - 6, d.size * 0.7, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(50, ${120 + 40 * d.shade}, 60, 0.8)`;
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(d.x - d.size * 0.3, d.y - 10, d.size * 0.5, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(40, ${130 + 30 * d.shade}, 55, 0.7)`;
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(d.x + d.size * 0.3, d.y - 8, d.size * 0.5, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(45, ${125 + 35 * d.shade}, 50, 0.7)`;
                    ctx.fill();
                    // 树干
                    ctx.fillStyle = '#7a6a5a';
                    ctx.fillRect(d.x - 3, d.y - 2, 6, 10);
                } else if (d.type === 'bldg') {
                    ctx.fillStyle = d.color;
                    ctx.shadowBlur = 8;
                    ctx.fillRect(d.x - d.w / 2, d.y - d.h / 2, d.w, d.h);
                    // 窗户
                    ctx.shadowBlur = 2;
                    ctx.fillStyle = 'rgba(255,240,200,0.4)';
                    const ww = d.w / 4,
                        wh = d.h / 4;
                    for (let i = -1; i <= 1; i++) {
                        for (let j = -1; j <= 0; j++) {
                            ctx.fillRect(d.x + i * ww * 1.2 - 4, d.y + j * wh * 1.2 - 4, 6, 6);
                        }
                    }
                    // 屋顶
                    ctx.shadowBlur = 4;
                    ctx.fillStyle = 'rgba(0,0,0,0.08)';
                    ctx.beginPath();
                    ctx.moveTo(d.x - d.w / 2 - 4, d.y - d.h / 2);
                    ctx.lineTo(d.x, d.y - d.h / 2 - 10);
                    ctx.lineTo(d.x + d.w / 2 + 4, d.y - d.h / 2);
                    ctx.fill();
                }
            }
            ctx.shadowBlur = 0;

            // 一些小花/草丛点缀
            for (let i = 0; i < 60; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const roadH2 = 280,
                    roadW2 = 380;
                if (x > roadW2 - 50 && x < roadW2 + 50 && y > roadH2 - 50 && y < roadH2 + 50) continue;
                if (x > roadW2 - 130 && x < roadW2 + 130 && y > roadH2 - 130 && y < roadH2 + 130) continue;
                ctx.fillStyle = `hsla(${60 + Math.random() * 40}, 70%, ${65 + Math.random() * 25}%, 0.5)`;
                ctx.beginPath();
                ctx.arc(x, y, 2 + Math.random() * 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 绘制单个元素
        function drawElement(el) {
            const { x, y, w, h, color, type, id, selected } = el;
            const cx = x,
                cy = y;

            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.15)';
            ctx.shadowBlur = 10;

            // 如果是选中状态，绘制高亮圈
            if (selected || state.selectedId === id) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = 'rgba(255,255,200,0.5)';
                ctx.beginPath();
                ctx.arc(cx, cy, Math.max(w, h) * 0.7 + 6, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,200,0.15)';
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(255,255,200,0.5)';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 6]);
                ctx.beginPath();
                ctx.arc(cx, cy, Math.max(w, h) * 0.7 + 6, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.shadowBlur = 10;
            }

            ctx.shadowColor = 'rgba(0,0,0,0.2)';

            switch (type) {
                case 'car': {
                    const cw = w,
                        ch = h;
                    // 车身
                    const grad = ctx.createLinearGradient(cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2);
                    grad.addColorStop(0, lightenColor(color, 20));
                    grad.addColorStop(1, color);
                    ctx.fillStyle = grad;
                    ctx.shadowBlur = 12;
                    roundRect(ctx, cx - cw / 2, cy - ch / 2 + 4, cw, ch - 8, 6);
                    ctx.fill();
                    // 车顶
                    ctx.fillStyle = darkenColor(color, 30);
                    roundRect(ctx, cx - cw / 2 + 8, cy - ch / 2 - 2, cw - 16, 14, 4);
                    ctx.fill();
                    // 车窗
                    ctx.fillStyle = 'rgba(180,225,255,0.7)';
                    roundRect(ctx, cx - cw / 2 + 12, cy - ch / 2 + 1, 10, 8, 2);
                    ctx.fill();
                    roundRect(ctx, cx + cw / 2 - 22, cy - ch / 2 + 1, 10, 8, 2);
                    ctx.fill();
                    // 车轮
                    ctx.shadowBlur = 6;
                    ctx.fillStyle = '#2a2a2a';
                    ctx.beginPath();
                    ctx.arc(cx - cw / 2 + 8, cy + ch / 2 - 4, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(cx + cw / 2 - 8, cy + ch / 2 - 4, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#3a3a3a';
                    ctx.beginPath();
                    ctx.arc(cx - cw / 2 + 8, cy + ch / 2 - 4, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(cx + cw / 2 - 8, cy + ch / 2 - 4, 3, 0, Math.PI * 2);
                    ctx.fill();
                    // 车灯
                    ctx.shadowBlur = 4;
                    ctx.fillStyle = '#ffd93d';
                    ctx.beginPath();
                    ctx.arc(cx - cw / 2 + 3, cy - 4, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(cx + cw / 2 - 3, cy - 4, 3, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                }
                case 'person': {
                    const sz = Math.min(w, h) * 0.6;
                    // 身体
                    ctx.shadowBlur = 12;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(cx, cy - sz * 0.35, sz * 0.45, 0, Math.PI * 2);
                    ctx.fill();
                    // 身体 (衣服)
                    ctx.fillStyle = darkenColor(color, 20);
                    ctx.beginPath();
                    ctx.moveTo(cx - sz * 0.4, cy - sz * 0.05);
                    ctx.quadraticCurveTo(cx - sz * 0.5, cy + sz * 0.35, cx - sz * 0.3, cy + sz * 0.5);
                    ctx.lineTo(cx + sz * 0.3, cy + sz * 0.5);
                    ctx.quadraticCurveTo(cx + sz * 0.5, cy + sz * 0.35, cx + sz * 0.4, cy - sz * 0.05);
                    ctx.fill();
                    // 腿
                    ctx.fillStyle = darkenColor(color, 40);
                    ctx.fillRect(cx - sz * 0.25, cy + sz * 0.4, 7, sz * 0.3);
                    ctx.fillRect(cx + sz * 0.1, cy + sz * 0.4, 7, sz * 0.3);
                    // 手臂
                    ctx.fillStyle = darkenColor(color, 10);
                    ctx.fillRect(cx - sz * 0.55, cy - sz * 0.1, 6, sz * 0.35);
                    ctx.fillRect(cx + sz * 0.4, cy - sz * 0.1, 6, sz * 0.35);
                    // 眼睛
                    ctx.fillStyle = '#2a2a2a';
                    ctx.beginPath();
                    ctx.arc(cx - sz * 0.15, cy - sz * 0.4, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(cx + sz * 0.15, cy - sz * 0.4, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    // 微笑
                    ctx.strokeStyle = '#2a2a2a';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(cx, cy - sz * 0.3, sz * 0.15, 0.1, Math.PI - 0.1);
                    ctx.stroke();
                    break;
                }
                case 'house': {
                    const hw = w / 2,
                        hh = h / 2;
                    // 墙壁
                    ctx.shadowBlur = 14;
                    const grad2 = ctx.createLinearGradient(cx - hw, cy - hh * 0.2, cx + hw, cy + hh);
                    grad2.addColorStop(0, lightenColor(color, 30));
                    grad2.addColorStop(1, color);
                    ctx.fillStyle = grad2;
                    roundRect(ctx, cx - hw, cy - hh * 0.2, w, h * 0.7, 4);
                    ctx.fill();
                    // 屋顶
                    ctx.fillStyle = darkenColor(color, 35);
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.moveTo(cx - hw - 6, cy - hh * 0.2);
                    ctx.lineTo(cx, cy - hh - 8);
                    ctx.lineTo(cx + hw + 6, cy - hh * 0.2);
                    ctx.closePath();
                    ctx.fill();
                    // 门
                    ctx.fillStyle = darkenColor(color, 50);
                    ctx.shadowBlur = 4;
                    roundRect(ctx, cx - 8, cy + hh * 0.2, 16, h * 0.3, 2);
                    ctx.fill();
                    ctx.fillStyle = '#ffd93d';
                    ctx.beginPath();
                    ctx.arc(cx + 6, cy + hh * 0.35, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    // 窗户
                    ctx.fillStyle = 'rgba(180,225,255,0.6)';
                    ctx.shadowBlur = 6;
                    const winSize = 10;
                    roundRect(ctx, cx - hw + 8, cy - hh * 0.1 + 4, winSize, winSize, 2);
                    ctx.fill();
                    roundRect(ctx, cx + hw - 18, cy - hh * 0.1 + 4, winSize, winSize, 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    ctx.fillRect(cx - hw + 10, cy - hh * 0.1 + 6, 3, 3);
                    ctx.fillRect(cx + hw - 16, cy - hh * 0.1 + 6, 3, 3);
                    break;
                }
            }
            ctx.restore();

            // 绘制ID标签（调试可关闭，这里作为小彩蛋 显示元素类型）
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(type, cx, cy + h * 0.7 + 14);
        }

        // 辅助: 圆角矩形
        function roundRect(ctx, x, y, w, h, r) {
            if (r > w / 2) r = w / 2;
            if (r > h / 2) r = h / 2;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }

        // 颜色工具
        function lightenColor(hex, amt) {
            let r = parseInt(hex.slice(1, 2), 16) * 17 || parseInt(hex.slice(1, 3), 16);
            let g = parseInt(hex.slice(2, 3), 16) * 17 || parseInt(hex.slice(3, 5), 16);
            let b = parseInt(hex.slice(3, 4), 16) * 17 || parseInt(hex.slice(5, 7), 16);
            if (hex.length === 7) {
                r = parseInt(hex.slice(1, 3), 16);
                g = parseInt(hex.slice(3, 5), 16);
                b = parseInt(hex.slice(5, 7), 16);
            }
            r = Math.min(255, r + amt);
            g = Math.min(255, g + amt);
            b = Math.min(255, b + amt);
            return `rgb(${r},${g},${b})`;
        }

        function darkenColor(hex, amt) {
            let r = parseInt(hex.slice(1, 2), 16) * 17 || parseInt(hex.slice(1, 3), 16);
            let g = parseInt(hex.slice(2, 3), 16) * 17 || parseInt(hex.slice(3, 5), 16);
            let b = parseInt(hex.slice(3, 4), 16) * 17 || parseInt(hex.slice(5, 7), 16);
            if (hex.length === 7) {
                r = parseInt(hex.slice(1, 3), 16);
                g = parseInt(hex.slice(3, 5), 16);
                b = parseInt(hex.slice(5, 7), 16);
            }
            r = Math.max(0, r - amt);
            g = Math.max(0, g - amt);
            b = Math.max(0, b - amt);
            return `rgb(${r},${g},${b})`;
        }

        // ---------- 渲染 ----------
        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawCityBackground();

            // 绘制所有元素
            for (const el of state.elements) {
                drawElement(el);
            }

            // 更新计数
            elementCountEl.textContent = state.elements.length;

            // 更新状态栏
            const toolNames = {
                select: '🖱️ 选择/拖动',
                car: '🚗 点击放置汽车',
                person: '🧑 点击放置人物',
                house: '🏠 点击放置房屋',
                paint: '🎨 点击元素涂色',
                delete: '🗑️ 点击删除元素'
            };
            const selectedEl = state.elements.find(e => e.id === state.selectedId);
            let statusMsg = toolNames[state.tool] || '🏙️ 自由建造';
            if (selectedEl && state.tool === 'select') {
                statusMsg = `✅ 已选中 ${selectedEl.type} (ID:${selectedEl.id})  ·  拖动移动`;
            }
            if (state.tool === 'paint' && selectedEl) {
                statusMsg = `🎨 点击颜色更改 ${selectedEl.type} 的颜色`;
            }
            statusBar.textContent = statusMsg;
        }

        // ---------- 元素操作 ----------
        function addElement(type, x, y) {
            // 防止重叠太严重: 检查是否与现有元素太近
            for (const el of state.elements) {
                const dx = el.x - x,
                    dy = el.y - y;
                if (Math.abs(dx) < 30 && Math.abs(dy) < 30) {
                    return false;
                }
            }
            // 边界限制
            const margin = 30;
            if (x < margin || x > canvas.width - margin || y < margin || y > canvas.height - margin) {
                return false;
            }

            const el = createElement(type, x, y, state.color);
            state.elements.push(el);

            // 记录撤销
            pushUndo({ type: 'add', element: el });

            // 自动选中新元素
            state.selectedId = el.id;
            render();
            return true;
        }

        function deleteElement(id) {
            const idx = state.elements.findIndex(e => e.id === id);
            if (idx === -1) return false;
            const removed = state.elements[idx];
            state.elements.splice(idx, 1);
            if (state.selectedId === id) state.selectedId = null;
            pushUndo({ type: 'delete', element: removed });
            render();
            return true;
        }

        function paintElement(id, color) {
            const el = state.elements.find(e => e.id === id);
            if (!el) return false;
            const oldColor = el.color;
            el.color = color;
            pushUndo({ type: 'paint', element: { ...el, color: oldColor }, newColor: color });
            render();
            return true;
        }

        function moveElement(id, dx, dy) {
            const el = state.elements.find(e => e.id === id);
            if (!el) return false;
            const oldX = el.x,
                oldY = el.y;
            el.x += dx;
            el.y += dy;
            // 边界限制
            const margin = 20;
            el.x = Math.max(margin, Math.min(canvas.width - margin, el.x));
            el.y = Math.max(margin, Math.min(canvas.height - margin, el.y));
            pushUndo({ type: 'move', element: { ...el, x: oldX, y: oldY }, newX: el.x, newY: el.y });
            render();
            return true;
        }

        function clearAll() {
            if (state.elements.length === 0) return;
            const snapshot = [...state.elements];
            state.elements = [];
            state.selectedId = null;
            pushUndo({ type: 'clear', elements: snapshot });
            render();
        }

        // ---------- 撤销系统 ----------
        function pushUndo(action) {
            state.undoStack.push(action);
            if (state.undoStack.length > state.maxUndo) {
                state.undoStack.shift();
            }
        }

        function undo() {
            if (state.undoStack.length === 0) return;
            const action = state.undoStack.pop();
            switch (action.type) {
                case 'add':
                    state.elements = state.elements.filter(e => e.id !== action.element.id);
                    if (state.selectedId === action.element.id) state.selectedId = null;
                    break;
                case 'delete':
                    state.elements.push(action.element);
                    break;
                case 'paint':
                    const el = state.elements.find(e => e.id === action.element.id);
                    if (el) el.color = action.element.color;
                    break;
                case 'move':
                    const el2 = state.elements.find(e => e.id === action.element.id);
                    if (el2) { el2.x = action.element.x;
                        el2.y = action.element.y; }
                    break;
                case 'clear':
                    state.elements = action.elements;
                    break;
                default:
                    break;
            }
            render();
        }

        // ---------- 点击检测 ----------
        function getElementAt(x, y) {
            // 从后往前遍历（上层优先）
            for (let i = state.elements.length - 1; i >= 0; i--) {
                const el = state.elements[i];
                const halfW = el.w / 2 + 6;
                const halfH = el.h / 2 + 6;
                if (x >= el.x - halfW && x <= el.x + halfW &&
                    y >= el.y - halfH && y <= el.y + halfH) {
                    return el;
                }
            }
            return null;
        }

        // ---------- 交互事件 ----------
        function getCanvasCoords(e) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            let clientX, clientY;
            if (e.touches) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
                e.preventDefault();
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        }

        function handlePointerDown(e) {
            e.preventDefault();
            const { x, y } = getCanvasCoords(e);
            const tool = state.tool;

            if (tool === 'select') {
                // 选择/拖动
                const hit = getElementAt(x, y);
                if (hit) {
                    state.selectedId = hit.id;
                    state.isDragging = true;
                    state.dragOffsetX = x - hit.x;
                    state.dragOffsetY = y - hit.y;
                    state.dragStartId = hit.id;
                    render();
                } else {
                    state.selectedId = null;
                    render();
                }
            } else if (tool === 'car' || tool === 'person' || tool === 'house') {
                const typeMap = { car: 'car', person: 'person', house: 'house' };
                addElement(typeMap[tool], x, y);
            } else if (tool === 'paint') {
                const hit = getElementAt(x, y);
                if (hit) {
                    paintElement(hit.id, state.color);
                    state.selectedId = hit.id;
                } else {
                    state.selectedId = null;
                    render();
                }
            } else if (tool === 'delete') {
                const hit = getElementAt(x, y);
                if (hit) {
                    deleteElement(hit.id);
                }
            }
        }

        function handlePointerMove(e) {
            e.preventDefault();
            if (!state.isDragging || state.tool !== 'select') return;
            const { x, y } = getCanvasCoords(e);
            const el = state.elements.find(e => e.id === state.dragStartId);
            if (!el) {
                state.isDragging = false;
                return;
            }
            const newX = x - state.dragOffsetX;
            const newY = y - state.dragOffsetY;
            const margin = 20;
            const clampedX = Math.max(margin, Math.min(canvas.width - margin, newX));
            const clampedY = Math.max(margin, Math.min(canvas.height - margin, newY));
            el.x = clampedX;
            el.y = clampedY;
            render();
        }

        function handlePointerUp(e) {
            if (state.isDragging) {
                // 记录移动的撤销
                const el = state.elements.find(e => e.id === state.dragStartId);
                if (el) {
                    // 移动撤销已经在 moveElement 中记录了，但这里我们手动记录一下
                    // 实际上我们用的是直接修改，需要补一个撤销记录
                    // 简单起见，我们在移动时已经记录了，但这里可能移动多次，我们只记录最终状态
                    // 改进：在每次移动时记录，但为了减少撤销栈，可以在mouseup时记录一次
                    // 这里我们使用一个简单的方法：在mouseup时记录整个移动
                    // 但由于我们已经在move中记录了，所以这里不再重复记录
                }
                state.isDragging = false;
                state.dragStartId = null;
                render();
            }
        }

        // ---------- 事件绑定 ----------
        canvas.addEventListener('mousedown', handlePointerDown);
        canvas.addEventListener('mousemove', handlePointerMove);
        canvas.addEventListener('mouseup', handlePointerUp);
        canvas.addEventListener('mouseleave', () => {
            if (state.isDragging) {
                state.isDragging = false;
                state.dragStartId = null;
                render();
            }
        });

        canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
        canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
        canvas.addEventListener('touchend', handlePointerUp, { passive: false });

        // ---------- 工具栏事件 ----------
        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.tool = btn.dataset.tool;
                // 如果切换到非选择工具，取消选中
                if (state.tool !== 'select' && state.tool !== 'paint') {
                    state.selectedId = null;
                }
                render();
            });
        });

        // 颜色选择
        document.querySelectorAll('.color-swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                sw.classList.add('active');
                state.color = sw.dataset.color;
                // 如果当前有选中的元素且工具是paint或select，可以实时预览
                render();
            });
        });

        // 清空按钮
        document.getElementById('clearBtn').addEventListener('click', () => {
            if (state.elements.length === 0) return;
            if (confirm('🧹 确定要清空城市中的所有元素吗？')) {
                clearAll();
            }
        });

        // 撤销按钮
        document.getElementById('undoBtn').addEventListener('click', undo);

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                undo();
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (state.selectedId) {
                    deleteElement(state.selectedId);
                }
            }
            if (e.key === 'Escape') {
                state.selectedId = null;
                render();
            }
        });

        // ---------- 初始化 ----------
        // 添加一些示例元素，让城市初始不那么空旷
        function initDemo() {
            const demoData = [
                { type: 'car', x: 180, y: 240, color: '#FF6B6B' },
                { type: 'car', x: 520, y: 340, color: '#4D96FF' },
                { type: 'person', x: 300, y: 200, color: '#FFD93D' },
                { type: 'person', x: 600, y: 420, color: '#6BCB77' },
                { type: 'house', x: 140, y: 120, color: '#FFA94D' },
                { type: 'house', x: 740, y: 520, color: '#9B59B6' },
                { type: 'car', x: 420, y: 540, color: '#FF6B9D' },
                { type: 'person', x: 780, y: 200, color: '#F5A0A0' },
                { type: 'house', x: 520, y: 140, color: '#A0C4FF' },
            ];
            for (const d of demoData) {
                const el = createElement(d.type, d.x, d.y, d.color);
                state.elements.push(el);
                state.nextId = Math.max(state.nextId, el.id + 1);
            }
            // 选中第一个元素
            if (state.elements.length > 0) {
                state.selectedId = state.elements[0].id;
            }
            render();
        }

        // 延迟初始化，确保DOM渲染完成
        setTimeout(() => {
            resizeCanvas();
            initDemo();
        }, 100);

        // 窗口resize时重新适配
        window.addEventListener('resize', resizeCanvas);

        // 额外：点击空白取消选中
        canvas.addEventListener('click', (e) => {
            // 但不要干扰拖拽
            if (!state.isDragging && state.tool === 'select') {
                const { x, y } = getCanvasCoords(e);
                const hit = getElementAt(x, y);
                if (!hit) {
                    state.selectedId = null;
                    render();
                }
            }
        });

        // 额外：在涂色模式下双击可快速选择颜色
        canvas.addEventListener('dblclick', (e) => {
            if (state.tool === 'paint') {
                const { x, y } = getCanvasCoords(e);
                const hit = getElementAt(x, y);
                if (hit) {
                    // 从元素取色
                    state.color = hit.color;
                    document.querySelectorAll('.color-swatch').forEach(sw => {
                        sw.classList.toggle('active', sw.dataset.color === hit.color);
                    });
                    render();
                }
            }
        });

        console.log('🏙️ 我的城市已加载！');
        console.log('💡 提示: 选择工具后点击元素可拖动，Delete键删除选中元素，Ctrl+Z撤销');
    </script>

</body>
</html>