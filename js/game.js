// 游戏配置
const GAME_MODES = {
    easy: { rows: 9, columns: 9, mines: 10 },
    medium: { rows: 12, columns: 12, mines: 25 },
    hard: { rows: 14, columns: 18, mines: 50 }
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
            cell.addEventListener('click', () => handleCellClick(row, col));
            
            // 添加右键点击事件监听器（标记地雷）
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleRightClick(row, col);
            });
            
            // 为移动设备添加长按事件（标记地雷）
            let pressTimer;
            let longPressTriggered = false;
            
            cell.addEventListener('touchstart', (e) => {
                longPressTriggered = false;
                pressTimer = setTimeout(() => {
                    longPressTriggered = true;
                    handleRightClick(row, col);
                }, 500);
            });
            
            cell.addEventListener('touchend', (e) => {
                clearTimeout(pressTimer);
                if (!longPressTriggered) {
                    // 只有在没有触发长按的情况下才执行点击
                    handleCellClick(row, col);
                }
                e.preventDefault(); // 防止进一步的点击事件
            });
            
            cell.addEventListener('touchmove', () => {
                clearTimeout(pressTimer);
                longPressTriggered = false;
            });
            
            gameBoard.appendChild(cell);
        }
    }
    
    // 适应屏幕大小
    setTimeout(adjustBoardSize, 0);
}

// 适应屏幕大小
function adjustBoardSize() {
    const main = document.querySelector('main');
    const board = document.getElementById('game-board');
    const { rows, columns } = GAME_MODES[gameState.mode];
    
    // 重置任何现有的缩放
    board.style.transform = 'scale(1)';
    
    // 获取主要容器和游戏板的尺寸
    const mainRect = main.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    
    // 检测是否是移动设备
    const isMobile = window.innerWidth <= 768;
    
    // 为移动设备和桌面设备使用不同的系数
    const fillFactor = isMobile ? 0.98 : 0.95;
    
    // 计算水平和垂直缩放比例，尽量占据更多空间
    const scaleX = (mainRect.width * fillFactor) / boardRect.width;
    const scaleY = (mainRect.height * fillFactor) / boardRect.height;
    
    // 在移动设备上，我们更倾向于填满空间
    const scale = Math.min(scaleX, scaleY);
    
    // 应用缩放
    board.style.transform = `scale(${scale})`;
    
    // 在调试模式下输出计算信息
    console.log(`Window size: ${window.innerWidth}x${window.innerHeight}`);
    console.log(`Main area: ${mainRect.width}x${mainRect.height}`);
    console.log(`Board size: ${boardRect.width}x${boardRect.height}`);
    console.log(`Applied scale: ${scale} (${scaleX}, ${scaleY})`);
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
    
    // 添加移动设备相关的事件处理
    document.addEventListener('touchstart', function(e) {
        // 防止双击缩放
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // 防止移动设备上的长按弹出菜单
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    
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