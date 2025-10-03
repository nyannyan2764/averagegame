import { gameState } from './state.js';

const elements = {
    screens: {
        setup: document.getElementById('setup-screen'),
        game: document.getElementById('game-screen'),
        result: document.getElementById('result-screen'),
        gameClear: document.getElementById('game-clear-screen'),
        elimination: document.getElementById('elimination-screen'),
    },
    totalPlayersInput: document.getElementById('total-players-input'),
    playerNameInput: document.getElementById('player-name-input'),
    playerList: document.getElementById('player-list'),
    startGameBtn: document.getElementById('start-game-btn'),
    currentPlayerCount: document.getElementById('current-player-count'),
    totalPlayerCount: document.getElementById('total-player-count'),
    roundTitle: document.getElementById('round-title'),
    currentRule: document.getElementById('current-rule'),
    scoreboard: document.getElementById('scoreboard'),
    inputArea: document.getElementById('input-area'),
    resultRoundTitle: document.getElementById('result-round-title'),
    chosenNumbers: document.getElementById('chosen-numbers'),
    averageValue: document.getElementById('average-value'),
    targetCalculationText: document.getElementById('target-calculation-text'),
    roundWinner: document.getElementById('round-winner'),
    resultScoreboard: document.getElementById('result-scoreboard'),
    finalWinner: document.getElementById('final-winner'),
    eliminatedPlayerName: document.getElementById('eliminated-player-name'),
};

export function showScreen(screenName) {
    Object.values(elements.screens).forEach(screen => {
        if (screen.classList.contains('overlay')) {
             screen.classList.remove('active');
        } else {
            screen.classList.remove('active');
        }
    });
    elements.screens[screenName].classList.add('active');
}

export function showOverlay(screenName) {
    elements.screens[screenName].classList.add('active');
}

export function hideOverlay(screenName) {
    elements.screens[screenName].classList.remove('active');
}

export function renderPlayerList() {
    elements.currentPlayerCount.textContent = gameState.players.length;
    elements.totalPlayerCount.textContent = gameState.totalPlayers;
    elements.playerList.innerHTML = '';
    gameState.players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name;
        elements.playerList.appendChild(li);
    });
}

export function updateStartButtonState() {
    elements.startGameBtn.disabled = gameState.players.length !== gameState.totalPlayers || gameState.players.length < 2;
}

export function renderScoreboard(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    gameState.players.forEach(player => {
        const card = document.createElement('div');
        card.className = 'score-card';
        if (!player.isAlive) card.classList.add('eliminated');
        card.innerHTML = `<div class="name">${player.name}</div><div class="score">${player.score}</div>`;
        container.appendChild(card);
    });
}

export function renderInputArea(alivePlayers, onJokerClick) {
    elements.inputArea.innerHTML = '';
    alivePlayers.forEach(player => {
        const group = document.createElement('div');
        group.className = 'player-input-group';
        group.innerHTML = `
            <label for="player-${player.name}">${player.name}:</label>
            <input type="password" id="player-${player.name}" required placeholder="***" autocomplete="off" inputmode="numeric" pattern="[0-9]*">
            <button class="joker-btn" data-player="${player.name}">JOKER</button>
        `;
        elements.inputArea.appendChild(group);
    });

    document.querySelectorAll('.joker-btn').forEach(btn => {
        btn.addEventListener('click', (e) => onJokerClick(e.target.dataset.player));
    });
}

export function updateRuleDisplay(aliveCount) {
    if (aliveCount === 2) {
        elements.currentRule.textContent = '特別ルール【最終決戦】：0と100が選択された場合、100の勝利。';
    } else if (aliveCount <= 3) {
        elements.currentRule.textContent = '特別ルール【終盤】：同数投票は全員減点。ターゲット完全一致で他全員-2点。';
    } else {
        elements.currentRule.textContent = '通常ルール：ターゲット倍率は 0.8';
    }
}

export function showResultScreenUI(result) {
    showScreen('result');
    elements.resultRoundTitle.textContent = `ラウンド ${gameState.currentRound} 結果`;
    elements.chosenNumbers.textContent = result.inputs.map(p => `${p.name}: ${p.number}`).join(' / ');
    
    if (result.specialRuleMessage) {
        elements.averageValue.textContent = '---';
        elements.targetCalculationText.innerHTML = `<strong class="target-highlight">${result.specialRuleMessage}</strong>`;
    } else if (isNaN(result.average)) {
        elements.averageValue.textContent = '計算不能 (全員JOKER)';
        elements.targetCalculationText.innerHTML = `ターゲット: <strong class="target-highlight">---</strong>`;
    } else {
        elements.averageValue.textContent = result.average.toFixed(3);
        elements.targetCalculationText.innerHTML = `ターゲット (平均値 × ${result.multiplier}): <strong id="target-number" class="target-highlight">${result.target.toFixed(3)}</strong>`;
    }
    
    elements.roundWinner.textContent = result.winners.length > 0 ? `勝者: ${result.winners.join(', ')}` : '勝者なし';
    renderScoreboard('resultScoreboard');
}

export function showGameClearScreen() {
    showScreen('gameClear');
    const winner = gameState.players.find(p => p.isAlive);
    elements.finalWinner.textContent = winner ? `勝者: ${winner.name}` : "生存者なし";
}

export function showEliminationScreenUI(eliminatedNames) {
    elements.eliminatedPlayerName.textContent = eliminatedNames.join(', ');
    showOverlay('elimination');
}

export default elements;
