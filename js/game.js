// 游戏配置
const GAME_MODES = {
    easy: { rows: 9, columns: 9, mines: 10 },
    medium: { rows: 16, columns: 16, mines: 40 },
    hard: { rows: 16, columns: 30, mines: 99 }
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
            cell.addEventListener('touchstart', (e) => {
                pressTimer = setTimeout(() => {
                    handleRightClick(row, col);
                }, 500);
            });
            
            cell.addEventListener('touchend', () => {
                clearTimeout(pressTimer);
            });
            
            cell.addEventListener('touchmove', () => {
                clearTimeout(pressTimer);
            });
            
            gameBoard.appendChild(cell);
        }
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

// 初始化游戏
initGame(); 