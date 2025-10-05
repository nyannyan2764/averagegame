import { gameState } from './state.js';
import * as UI from './ui.js';
import elements from './ui.js';

/**
 * プレイヤーをゲームに追加する
 */
function addPlayer() {
    const name = elements.playerNameInput.value.trim().toUpperCase();
    if (name && !gameState.players.some(p => p.name === name)) {
        gameState.players.push({ name, score: 0, isAlive: true, hasUsedJoker: false });
        UI.renderPlayerList();
        UI.updateStartButtonState();
        elements.playerNameInput.value = '';
        elements.playerNameInput.focus();
    } else if (gameState.players.some(p => p.name === name)) {
        alert('エラー：同じ名前のプレイヤーが既に存在します。');
    }
}

/**
 * ラウンドを開始し、プレイヤー選択画面を表示する
 */
function startRound() {
    UI.showScreen('game');
    gameState.jokerSelections = {};
    gameState.currentUser = null;
    let selectedPlayer = null;

    elements.roundTitle.textContent = `ラウンド ${gameState.currentRound}`;
    UI.renderScoreboard('scoreboard');

    const alivePlayers = gameState.players.filter(p => p.isAlive);
    UI.updateRuleDisplay(alivePlayers.length, gameState.currentRound);

    const onSelect = (playerName) => {
        selectedPlayer = playerName;
        elements.confirmPlayerBtn.disabled = false;
    };

    UI.showPlayerSelect(alivePlayers, onSelect);
    
    const confirmButtonClickHandler = () => {
        if (selectedPlayer) {
            gameState.currentUser = selectedPlayer;
            UI.hidePlayerSelect();
            UI.renderInputArea(alivePlayers, handleJokerClick);
            UI.updateControllableView();
        }
    };
    
    const newConfirmBtn = elements.confirmPlayerBtn.cloneNode(true);
    elements.confirmPlayerBtn.parentNode.replaceChild(newConfirmBtn, elements.confirmPlayerBtn);
    elements.confirmPlayerBtn = document.getElementById('confirm-player-btn');
    elements.confirmPlayerBtn.disabled = true;
    elements.confirmPlayerBtn.addEventListener('click', confirmButtonClickHandler);
}

/**
 * JOKERボタンがクリックされたときの処理
 */
function handleJokerClick(playerName) {
    const inputEl = document.getElementById(`player-${playerName}`);
    const jokerBtn = document.querySelector(`.joker-btn[data-player="${playerName}"]`);
    
    gameState.jokerSelections[playerName] = !gameState.jokerSelections[playerName];
    
    if (gameState.jokerSelections[playerName]) {
        jokerBtn.classList.add('selected');
        inputEl.disabled = true;
        inputEl.value = '';
        inputEl.classList.add('joker-selected');
    } else {
        jokerBtn.classList.remove('selected');
        inputEl.disabled = false;
        inputEl.classList.remove('joker-selected');
    }
}

/**
 * ラウンドの結果を計算・処理する
 */
function processRound() {
    const alivePlayers = gameState.players.filter(p => p.isAlive);
    const inputs = [];
    
    // *** 変更点：全員の入力が完了しているかチェック ***
    for (const player of alivePlayers) {
        const inputEl = document.getElementById(`player-${player.name}`);
        const isJoker = gameState.jokerSelections[player.name] || false;
        if (inputEl.value === '' && !isJoker) {
            alert(`${player.name}が未入力です。全員が数字を入力するか、JOKERを選択してください。`);
            return; // 処理を中断
        }
    }

    // 全員の入力が確認できたので、データを収集
    alivePlayers.forEach(player => {
        if (gameState.jokerSelections[player.name]) {
            inputs.push({ name: player.name, number: 'JOKER' });
            const playerState = gameState.players.find(p => p.name === player.name);
            if (playerState) playerState.hasUsedJoker = true;
        } else {
            const inputEl = document.getElementById(`player-${player.name}`);
            const value = parseInt(inputEl.value, 10);
            inputs.push({ name: player.name, number: value });
        }
    });

    const numberInputs = inputs.filter(p => p.number !== 'JOKER');

    // 【天啓】ルールの判定
    if (alivePlayers.length === 4 && gameState.currentRound >= 5 && numberInputs.length > 0) {
        const tempTotal = numberInputs.reduce((sum, p) => sum + p.number, 0);
        const tempAvg = tempTotal / numberInputs.length;
        const tempTarget = Math.round(tempAvg * 0.8);

        const isPrime = num => {
            if (num <= 1) return false;
            for (let i = 2; i * i <= num; i++) if (num % i === 0) return false;
            return true;
        };

        if (isPrime(tempTarget)) {
            const winners = numberInputs.filter(p => p.number === tempTarget).map(p => p.name);
            if (winners.length > 0) {
                alivePlayers.forEach(p => {
                    if (!winners.includes(p.name)) p.score -= 2;
                });
                updateAndDisplayResults({ inputs, winners, specialRuleMessage: `天啓発動！ターゲット素数【${tempTarget}】に完全一致！` });
                return;
            }
        }
    }
    
    // 【最終決戦】ルール
    if (alivePlayers.length === 2 && numberInputs.length === 2) {
        const nums = numberInputs.map(p => p.number).sort((a,b) => a-b);
        if (nums[0] === 0 && nums[1] === 100) {
            const winnerName = numberInputs.find(p => p.number === 100).name;
            const loserName = numberInputs.find(p => p.number === 0).name;
            gameState.players.find(p => p.name === loserName).score -= 1;
            updateAndDisplayResults({ inputs, winners: [winnerName], specialRuleMessage: '特別ルール「0-100」成立' });
            return;
        }
    }
    
    // 【終盤】ルール
    if (alivePlayers.length <= 3 && numberInputs.length > 0) {
        const counts = numberInputs.reduce((acc, p) => { acc[p.number] = (acc[p.number] || 0) + 1; return acc; }, {});
        const hasDuplicates = Object.values(counts).some(count => count > 1);

        if (hasDuplicates) {
            alivePlayers.forEach(p => { p.score -= 1; });
            updateAndDisplayResults({ inputs, winners: [], specialRuleMessage: '同数投票のため全員-1点' });
            return;
        }
        
        const multiplier = 1.2;
        const total = numberInputs.reduce((sum, p) => sum + p.number, 0);
        const average = total / numberInputs.length;
        const target = average * multiplier;
        const exactWinners = numberInputs.filter(p => p.number === target).map(p => p.name);

        if (exactWinners.length > 0) {
            alivePlayers.forEach(p => { if (!exactWinners.includes(p.name)) p.score -= 2; });
            updateAndDisplayResults({ inputs, average, target, winners: exactWinners, multiplier, specialRuleMessage: 'ターゲット完全一致により他全員-2点' });
            return;
        }
    }

    // 通常ルール
    const multiplier = alivePlayers.length <= 3 ? 1.2 : 0.8;
    let average = NaN, target = NaN, winners = [];
    if (numberInputs.length > 0) {
        const total = numberInputs.reduce((sum, p) => sum + p.number, 0);
        average = total / numberInputs.length;
        target = average * multiplier;
        let minDiff = Infinity;
        numberInputs.forEach(p => {
            const diff = Math.abs(p.number - target);
            if (diff < minDiff) { minDiff = diff; winners = [p.name]; }
            else if (diff === minDiff) { winners.push(p.name); }
        });
    }

    alivePlayers.forEach(p => {
        const playerInput = inputs.find(i => i.name === p.name);
        if (!winners.includes(p.name) && playerInput.number !== 'JOKER') {
            p.score -= 1;
        }
    });
    
    updateAndDisplayResults({ inputs, average, target, winners, multiplier });
}

/**
 * 結果を画面に表示し、脱落者を処理する
 */
function updateAndDisplayResults(result) {
    const newlyEliminated = [];
    gameState.players.forEach(p => {
        if (p.isAlive && p.score <= -10) {
            p.isAlive = false;
            newlyEliminated.push(p.name);
        }
    });

    UI.showResultScreenUI(result);

    if (newlyEliminated.length > 0) {
        setTimeout(() => UI.showEliminationScreenUI(newlyEliminated), 1000);
    }
}

/**
 * 次のラウンドに進む
 */
function nextRound() {
    const remainingPlayers = gameState.players.filter(p => p.isAlive).length;
    if (remainingPlayers <= 1) {
        UI.showGameClearScreen();
    } else {
        gameState.currentRound++;
        startRound();
    }
}

/**
 * ゲームをリセットする
 */
function resetGame() {
    gameState.players = [];
    gameState.currentRound = 1;
    gameState.jokerSelections = {};
    gameState.totalPlayers = parseInt(elements.totalPlayersInput.value, 10);
    UI.renderPlayerList();
    UI.updateStartButtonState();
    UI.showScreen('setup');
}

/**
 * アプリケーションを初期化し、イベントリスナーを設定する
 */
function init() {
    UI.renderPlayerList();
    UI.updateStartButtonState();

    elements.totalPlayersInput.addEventListener('change', () => {
        gameState.totalPlayers = parseInt(elements.totalPlayersInput.value, 10) || 2;
        UI.renderPlayerList();
        UI.updateStartButtonState();
    });
    
    elements.playerNameInput.addEventListener('input', UI.updateStartButtonState);
    elements.playerNameInput.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter') addPlayer(); 
    });
    
    document.getElementById('add-player-btn').addEventListener('click', addPlayer);
    elements.startGameBtn.addEventListener('click', startRound);
    document.getElementById('submit-numbers-btn').addEventListener('click', processRound);
    document.getElementById('next-round-btn').addEventListener('click', nextRound);
    document.getElementById('spectate-btn').addEventListener('click', () => UI.hideOverlay('elimination'));
    document.getElementById('play-again-btn-clear').addEventListener('click', resetGame);
}

init();
