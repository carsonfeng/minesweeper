// 游戏配置
const GAME_MODES = {
    easy: { rows: 9, columns: 9, mines: 10 },
    medium: { rows: 11, columns: 11, mines: 22 },
    hard: { rows: 11, columns: 13, mines: 32 }
};

// 游戏状态
let gameState = {
    mode: 'easy',
    board: [],
    mines: [],
    minesCount: 0,
    revealedCount: 0,
    flaggedCount: 0,
    gameOver: false,
    gameWon: false,
    timer: 0,
    timerInterval: null,
    firstClick: true
};

// DOM 元素
const gameBoard = document.getElementById('game-board');
const minesCounter = document.getElementById('mines-count');
const timerElement = document.getElementById('timer');
const resetButton = document.getElementById('reset-button');
const difficultyButtons = document.querySelectorAll('.difficulty button');

// 初始化游戏
function initGame(mode = 'easy') {
    // 清除之前的游戏状态
    clearInterval(gameState.timerInterval);
    
    // 设置新游戏状态
    gameState = {
        mode,
        board: [],
        mines: [],
        minesCount: GAME_MODES[mode].mines,
        revealedCount: 0,
        flaggedCount: 0,
        gameOver: false,
        gameWon: false,
        timer: 0,
        timerInterval: null,
        firstClick: true
    };
    
    // 更新UI
    minesCounter.textContent = gameState.minesCount;
    timerElement.textContent = '0';
    resetButton.textContent = '😊';
    
    // 创建游戏面板
    createBoard();
    
    // 强制刷新布局并调整大小
    setTimeout(() => {
        adjustBoardSize();
        // 500毫秒后再次调整以确保布局稳定
        setTimeout(adjustBoardSize, 500);
    }, 50);
    
    // 尝试进入全屏模式 (针对移动设备)
    tryEnterFullscreen();
}

// 创建游戏面板
function createBoard() {
    // 清空游戏面板
    gameBoard.innerHTML = '';
    
    const { rows, columns } = GAME_MODES[gameState.mode];
    
    // 设置CSS变量以控制网格大小
    document.documentElement.style.setProperty('--rows', rows);
    document.documentElement.style.setProperty('--columns', columns);
    
    // 初始化游戏面板数组
    gameState.board = Array(rows).fill().map(() => Array(columns).fill(0));
    
    // 创建单元格
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // 添加单击事件监听器
            cell.addEventListener('click', (e) => {
                e.preventDefault();
                handleCellClick(row, col);
            });
            
            // 添加右键点击事件监听器（标记地雷）
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleRightClick(row, col);
            });
            
            // 为移动设备添加长按事件（标记地雷）
            let pressTimer;
            let longPressTriggered = false;
            let touchStartX = 0, touchStartY = 0;
            
            cell.addEventListener('touchstart', (e) => {
                e.preventDefault(); // 阻止默认行为，防止出现菜单
                
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                longPressTriggered = false;
                
                pressTimer = setTimeout(() => {
                    longPressTriggered = true;
                    handleRightClick(row, col);
                    
                    // 添加触觉反馈（如果支持）
                    if (window.navigator.vibrate) {
                        window.navigator.vibrate(50);
                    }
                }, 500);
            }, { passive: false }); // 重要：设置为非被动模式，允许preventDefault生效
            
            cell.addEventListener('touchend', (e) => {
                e.preventDefault();
                clearTimeout(pressTimer);
                
                // 计算移动距离
                if (e.changedTouches && e.changedTouches[0]) {
                    const touchEndX = e.changedTouches[0].clientX;
                    const touchEndY = e.changedTouches[0].clientY;
                    const distance = Math.sqrt(
                        Math.pow(touchEndX - touchStartX, 2) + 
                        Math.pow(touchEndY - touchStartY, 2)
                    );
                    
                    // 如果没有触发长按且移动距离小，则算作点击
                    if (!longPressTriggered && distance < 10) {
                        handleCellClick(row, col);
                    }
                } else if (!longPressTriggered) {
                    handleCellClick(row, col);
                }
            }, { passive: false });
            
            cell.addEventListener('touchmove', (e) => {
                // 如果移动超过一定距离，取消长按
                if (e.touches && e.touches[0]) {
                    const touchMoveX = e.touches[0].clientX;
                    const touchMoveY = e.touches[0].clientY;
                    const distance = Math.sqrt(
                        Math.pow(touchMoveX - touchStartX, 2) + 
                        Math.pow(touchMoveY - touchStartY, 2)
                    );
                    
                    if (distance > 10) {
                        clearTimeout(pressTimer);
                        longPressTriggered = false;
                    }
                }
            }, { passive: true });
            
            gameBoard.appendChild(cell);
        }
    }
    
    // 适应屏幕大小
    setTimeout(adjustBoardSize, 0);
}

// 适应屏幕大小
function adjustBoardSize() {
    const gameBoard = document.getElementById('game-board');
    const main = document.querySelector('main');
    
    // 重置样式以获取本来尺寸
    gameBoard.style.transform = 'scale(1)';
    
    const isMobile = window.innerWidth <= 768;
    const isSmallScreen = window.innerWidth <= 360;
    const currentMode = GAME_MODES[gameState.mode];
    
    // 游戏板的实际大小
    const boardWidth = gameBoard.offsetWidth;
    const boardHeight = gameBoard.offsetHeight;
    
    // 可用的主区域尺寸（减去内边距和安全边距）
    const mainPadding = parseInt(window.getComputedStyle(main).padding) * 2 || 0;
    const safetyMargin = isMobile ? (isSmallScreen ? 10 : 15) : 20; // 根据屏幕大小调整安全边距
    const mainWidth = main.offsetWidth - mainPadding - safetyMargin;
    const mainHeight = main.offsetHeight - mainPadding - safetyMargin;
    
    // 计算水平和垂直缩放比例
    const scaleX = mainWidth / boardWidth;
    const scaleY = mainHeight / boardHeight;
    
    // 使用两个缩放比例中较小的一个，确保完全适合
    let scale = Math.min(scaleX, scaleY);
    
    // 为不同模式设置最小缩放限制
    if (gameState.mode === 'medium') {
        scale = Math.max(scale, isMobile ? (isSmallScreen ? 0.65 : 0.7) : 0.75);
    } else if (gameState.mode === 'hard') {
        scale = Math.max(scale, isMobile ? (isSmallScreen ? 0.55 : 0.6) : 0.65);
    }
    
    // 应用缩放
    gameBoard.style.transform = `scale(${scale})`;
    
    // 在调试模式下输出信息
    if (localStorage.getItem('debugMode') === 'true') {
        console.log(`游戏模式: ${gameState.mode} (${currentMode.rows}x${currentMode.columns})`);
        console.log(`设备: ${isMobile ? (isSmallScreen ? '小屏手机' : '手机') : '桌面'}`);
        console.log(`窗口尺寸: ${window.innerWidth}×${window.innerHeight}`);
        console.log(`主区域尺寸: ${mainWidth}×${mainHeight}`);
        console.log(`棋盘尺寸: ${boardWidth}×${boardHeight}`);
        console.log(`应用缩放: ${scale.toFixed(3)} (X: ${scaleX.toFixed(3)}, Y: ${scaleY.toFixed(3)})`);
    }
}

// 生成地雷
function generateMines(firstRow, firstCol) {
    const { rows, columns, mines } = GAME_MODES[gameState.mode];
    gameState.mines = [];
    
    // 确保第一次点击的位置及其周围没有地雷
    const safeZone = [];
    for (let r = Math.max(0, firstRow - 1); r <= Math.min(rows - 1, firstRow + 1); r++) {
        for (let c = Math.max(0, firstCol - 1); c <= Math.min(columns - 1, firstCol + 1); c++) {
            safeZone.push(`${r},${c}`);
        }
    }
    
    // 随机放置地雷
    while (gameState.mines.length < mines) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * columns);
        const position = `${row},${col}`;
        
        if (!gameState.mines.includes(position) && !safeZone.includes(position)) {
            gameState.mines.push(position);
            gameState.board[row][col] = -1; // -1 表示地雷
        }
    }
    
    // 计算每个单元格周围的地雷数量
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            // 跳过地雷单元格
            if (gameState.board[row][col] === -1) continue;
            
            // 计算周围地雷数量
            let count = 0;
            for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
                for (let c = Math.max(0, col - 1); c <= Math.min(columns - 1, col + 1); c++) {
                    if (gameState.board[r][c] === -1) count++;
                }
            }
            
            gameState.board[row][col] = count;
        }
    }
}

// 处理单元格点击
function handleCellClick(row, col) {
    // 如果游戏结束或单元格已被翻开或已被标记，则不执行操作
    if (gameState.gameOver || isCellRevealed(row, col) || isCellFlagged(row, col)) {
        return;
    }
    
    // 第一次点击时生成地雷并开始计时器
    if (gameState.firstClick) {
        generateMines(row, col);
        startTimer();
        gameState.firstClick = false;
    }
    
    // 如果点击到地雷，游戏结束
    if (gameState.board[row][col] === -1) {
        revealAllMines();
        endGame(false);
        return;
    }
    
    // 翻开单元格
    revealCell(row, col);
    
    // 检查是否赢得游戏
    checkWinCondition();
}

// 处理右键点击（标记地雷）
function handleRightClick(row, col) {
    // 如果游戏结束或单元格已被翻开，则不执行操作
    if (gameState.gameOver || isCellRevealed(row, col)) {
        return;
    }
    
    // 如果是第一次操作，开始计时器
    if (gameState.firstClick) {
        startTimer();
        gameState.firstClick = false;
    }
    
    const cell = getCellElement(row, col);
    
    // 切换标记状态
    if (isCellFlagged(row, col)) {
        cell.classList.remove('flagged');
        gameState.flaggedCount--;
    } else {
        // 如果标记的地雷数量已达到总地雷数，则不允许再标记
        if (gameState.flaggedCount >= gameState.minesCount) {
            return;
        }
        
        cell.classList.add('flagged');
        gameState.flaggedCount++;
    }
    
    // 更新剩余地雷计数器
    updateMinesCounter();
}

// 翻开单元格
function revealCell(row, col) {
    const { rows, columns } = GAME_MODES[gameState.mode];
    
    // 边界检查和已翻开检查
    if (row < 0 || row >= rows || col < 0 || col >= columns || isCellRevealed(row, col) || isCellFlagged(row, col)) {
        return;
    }
    
    const cell = getCellElement(row, col);
    const value = gameState.board[row][col];
    
    // 标记为已翻开
    cell.classList.add('revealed');
    gameState.revealedCount++;
    
    // 如果是数字，显示数字
    if (value > 0) {
        cell.textContent = value;
        cell.dataset.value = value;
    }
    
    // 如果是空白（值为0），自动翻开周围的单元格
    if (value === 0) {
        for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(columns - 1, col + 1); c++) {
                // 跳过自身
                if (r === row && c === col) continue;
                
                revealCell(r, c);
            }
        }
    }
}

// 翻开所有地雷
function revealAllMines() {
    gameState.mines.forEach(position => {
        const [row, col] = position.split(',').map(Number);
        const cell = getCellElement(row, col);
        
        cell.classList.add('revealed');
        cell.classList.add('mine');
        cell.textContent = '💣';
    });
}

// 获取单元格元素
function getCellElement(row, col) {
    return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

// 检查单元格是否已翻开
function isCellRevealed(row, col) {
    const cell = getCellElement(row, col);
    return cell.classList.contains('revealed');
}

// 检查单元格是否已标记
function isCellFlagged(row, col) {
    const cell = getCellElement(row, col);
    return cell.classList.contains('flagged');
}

// 更新地雷计数器
function updateMinesCounter() {
    minesCounter.textContent = gameState.minesCount - gameState.flaggedCount;
}

// 开始计时器
function startTimer() {
    gameState.timerInterval = setInterval(() => {
        gameState.timer++;
        timerElement.textContent = gameState.timer;
    }, 1000);
}

// 检查是否赢得游戏
function checkWinCondition() {
    const { rows, columns, mines } = GAME_MODES[gameState.mode];
    const totalCells = rows * columns;
    
    // 如果翻开的单元格数量 + 地雷数量 = 总单元格数量，则获胜
    if (gameState.revealedCount === totalCells - mines) {
        endGame(true);
    }
}

// 结束游戏
function endGame(isWin) {
    gameState.gameOver = true;
    gameState.gameWon = isWin;
    clearInterval(gameState.timerInterval);
    
    // 更新重置按钮表情
    resetButton.textContent = isWin ? '😎' : '😵';
    
    // 如果获胜，标记所有地雷
    if (isWin) {
        gameState.mines.forEach(position => {
            const [row, col] = position.split(',').map(Number);
            const cell = getCellElement(row, col);
            
            if (!cell.classList.contains('flagged')) {
                cell.classList.add('flagged');
            }
        });
        
        // 更新地雷计数器为0
        minesCounter.textContent = '0';
    }
}

// 事件监听器
resetButton.addEventListener('click', () => {
    initGame(gameState.mode);
});

difficultyButtons.forEach(button => {
    button.addEventListener('click', () => {
        // 更新活动按钮样式
        difficultyButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // 初始化新的游戏模式
        initGame(button.id);
    });
});

// 尝试进入全屏模式
function tryEnterFullscreen() {
    // 仅在移动设备上尝试全屏
    if (window.innerWidth <= 768 && document.documentElement.requestFullscreen) {
        document.addEventListener('click', function fullscreenHandler() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log(`全屏请求被拒绝: ${err.message}`);
                });
            }
            // 移除事件监听器，避免重复触发
            document.removeEventListener('click', fullscreenHandler);
        }, { once: true });
    }
}

// 确保屏幕不会睡眠 (仅在游戏进行时)
function preventSleep() {
    if ('wakeLock' in navigator) {
        let wakeLock = null;
        
        async function requestWakeLock() {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
            } catch (err) {
                console.log(`请求WakeLock失败: ${err.message}`);
            }
        }
        
        // 当游戏开始时请求
        document.addEventListener('click', requestWakeLock, { once: true });
        
        // 当页面可见性改变时重新请求
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && !gameState.gameOver) {
                requestWakeLock();
            }
        });
    }
}

// 添加屏幕方向锁定 (可选)
function lockScreenOrientation() {
    if (screen.orientation && screen.orientation.lock) {
        // 尝试锁定屏幕方向为当前方向
        screen.orientation.lock(screen.orientation.type).catch(err => {
            console.log(`屏幕方向锁定失败: ${err.message}`);
        });
    }
}

// 屏幕方向变化时的处理
function handleOrientationChange() {
    // 等待足够的时间让浏览器完成方向旋转
    setTimeout(() => {
        // 强制重新计算布局
        document.body.style.display = 'none';
        // 触发重排
        void document.body.offsetHeight;
        document.body.style.display = '';
        
        // 调整游戏棋盘大小
        setTimeout(adjustBoardSize, 300);
    }, 100);
}

// 添加调试模式切换函数
function toggleDebugMode() {
    const currentMode = localStorage.getItem('debugMode') === 'true';
    localStorage.setItem('debugMode', (!currentMode).toString());
    console.log(`调试模式: ${!currentMode ? '开启' : '关闭'}`);
    return !currentMode;
}

// 添加窗口尺寸变化监听，以便在旋转或调整窗口大小时重新调整棋盘
window.addEventListener('resize', debounce(function() {
    if (gameState.started) {
        adjustBoardSize();
    }
}, 250));

// 防抖函数，避免频繁调用
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// 在页面加载完成后初始化游戏
window.addEventListener('load', () => {
    // 检测是否是移动设备并默认使用适合的难度
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        // 移动设备默认使用简单模式
        document.getElementById('easy').classList.add('active');
        document.getElementById('medium').classList.remove('active');
        document.getElementById('hard').classList.remove('active');
        initGame('easy');
    } else {
        initGame();
    }
    
    preventSleep();
    
    // 防止选择文本和显示上下文菜单
    document.body.addEventListener('selectstart', function(e) { 
        e.preventDefault();
        return false;
    }, { passive: false });
    
    // 防止长按显示菜单
    document.body.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    }, { passive: false });
    
    // 防止拖动
    document.body.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    }, { passive: false });
    
    // 添加移动设备相关的事件处理
    document.addEventListener('touchstart', function(e) {
        // 防止双击缩放
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // 窗口大小改变时调整游戏板大小
    window.addEventListener('resize', () => {
        setTimeout(adjustBoardSize, 200);
    });
    
    // 屏幕方向改变时重新调整大小
    if (screen.orientation) {
        screen.orientation.addEventListener('change', handleOrientationChange);
    } else {
        // 旧版API兼容
        window.addEventListener('orientationchange', handleOrientationChange);
    }
}); 