import { gameState } from './state.js';
import * as UI from './ui.js';
import elements from './ui.js';

function addPlayer() {
    const name = UI.elements.playerNameInput.value.trim().toUpperCase();
    if (name && !gameState.players.some(p => p.name === name)) {
        gameState.players.push({ name, score: 0, isAlive: true });
        UI.renderPlayerList();
        UI.updateStartButtonState();
        UI.elements.playerNameInput.value = '';
        UI.elements.playerNameInput.focus();
    } else if (gameState.players.some(p => p.name === name)) {
        alert('エラー：同じ名前のプレイヤーが既に存在します。');
    }
}

function startRound() {
    UI.showScreen('game');
    gameState.jokerSelections = {};
    elements.roundTitle.textContent = `ラウンド ${gameState.currentRound}`;
    UI.renderScoreboard('scoreboard');

    const alivePlayers = gameState.players.filter(p => p.isAlive);
    UI.updateRuleDisplay(alivePlayers.length);
    UI.renderInputArea(alivePlayers, handleJokerClick);
}

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

function processRound() {
    const alivePlayers = gameState.players.filter(p => p.isAlive);
    const inputs = [];
    let allValid = true;

    alivePlayers.forEach(player => {
        if (gameState.jokerSelections[player.name]) {
            inputs.push({ name: player.name, number: 'JOKER' });
        } else {
            const inputEl = document.getElementById(`player-${player.name}`);
            const value = parseInt(inputEl.value, 10);
            if (isNaN(value) || value < 0 || value > 100) {
                alert(`エラー：${player.name}の入力が不正です。`);
                allValid = false;
            }
            inputs.push({ name: player.name, number: value });
        }
    });

    if (!allValid) return;

    const numberInputs = inputs.filter(p => p.number !== 'JOKER');
    
    // 【最終決戦】ルール (2人)
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
    
    // 【終盤】ルール (3人以下)
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

    // 通常ルール or 終盤ルールの通常判定
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
        if (!winners.includes(p.name) && !gameState.jokerSelections[p.name]) { p.score -= 1; }
    });
    
    updateAndDisplayResults({ inputs, average, target, winners, multiplier });
}

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

function nextRound() {
    const remainingPlayers = gameState.players.filter(p => p.isAlive).length;
    if (remainingPlayers <= 1) {
        UI.showGameClearScreen();
    } else {
        gameState.currentRound++;
        startRound();
    }
}

function resetGame() {
    gameState.players = [];
    gameState.currentRound = 1;
    gameState.jokerSelections = {};
    gameState.totalPlayers = parseInt(elements.totalPlayersInput.value, 10);
    UI.renderPlayerList();
    UI.updateStartButtonState();
    UI.showScreen('setup');
}

function init() {
    UI.renderPlayerList();
    UI.updateStartButtonState();

    elements.totalPlayersInput.addEventListener('change', (e) => {
        gameState.totalPlayers = parseInt(e.target.value, 10) || 2;
        UI.renderPlayerList();
        UI.updateStartButtonState();
    });
    elements.playerNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addPlayer(); });
    document.getElementById('add-player-btn').addEventListener('click', addPlayer);
    elements.startGameBtn.addEventListener('click', startRound);
    document.getElementById('submit-numbers-btn').addEventListener('click', processRound);
    document.getElementById('next-round-btn').addEventListener('click', nextRound);
    document.getElementById('spectate-btn').addEventListener('click', () => UI.hideOverlay('elimination'));
    document.getElementById('play-again-btn-clear').addEventListener('click', resetGame);
}

// アプリケーションの初期化
init();
