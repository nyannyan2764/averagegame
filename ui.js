import { gameState } from './state.js';

const elements = {
    // Screen containers
    screens: {
        setup: document.getElementById('setup-screen'),
        game: document.getElementById('game-screen'),
        result: document.getElementById('result-screen'),
        gameClear: document.getElementById('game-clear-screen'),
        elimination: document.getElementById('elimination-screen'),
    },
    // Setup screen elements
    totalPlayersInput: document.getElementById('total-players-input'),
    playerNameInput: document.getElementById('player-name-input'),
    addPlayerBtn: document.getElementById('add-player-btn'),
    playerList: document.getElementById('player-list'),
    startGameBtn: document.getElementById('start-game-btn'),
    currentPlayerCount: document.getElementById('current-player-count'),
    totalPlayerCount: document.getElementById('total-player-count'),
    // Game screen elements
    roundTitle: document.getElementById('round-title'),
    currentRule: document.getElementById('current-rule'),
    scoreboard: document.getElementById('scoreboard'),
    inputArea: document.getElementById('input-area'),
    submitNumbersBtn: document.getElementById('submit-numbers-btn'),
    // Player select overlay elements
    playerSelectOverlay: document.getElementById('player-select-overlay'),
    playerSelectButtons: document.getElementById('player-select-buttons'),
    confirmPlayerBtn: document.getElementById('confirm-player-btn'),
    // Result screen elements
    resultRoundTitle: document.getElementById('result-round-title'),
    chosenNumbers: document.getElementById('chosen-numbers'),
    averageValue: document.getElementById('average-value'),
    targetCalculationText: document.getElementById('target-calculation-text'),
    roundWinner: document.getElementById('round-winner'),
    resultScoreboard: document.getElementById('result-scoreboard'),
    // Game clear screen elements
    finalWinner: document.getElementById('final-winner'),
    // Elimination overlay elements
    eliminatedPlayerName: document.getElementById('eliminated-player-name'),
};

export function showScreen(screenName) {
    Object.values(elements.screens).forEach(screen => {
        if (!screen.classList.contains('overlay')) {
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
    const isNameEntered = elements.playerNameInput.value.trim() !== '';
    const canAddMorePlayers = gameState.players.length < gameState.totalPlayers;
    elements.addPlayerBtn.disabled = !(isNameEntered && canAddMorePlayers);
    elements.startGameBtn.disabled = !(gameState.players.length === gameState.totalPlayers && gameState.players.length >= 2);
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

export function showPlayerSelect(alivePlayers, onSelect) {
    const container = elements.playerSelectButtons;
    container.innerHTML = '';
    
    alivePlayers.forEach(player => {
        const btn = document.createElement('button');
        btn.className = 'player-select-btn';
        btn.textContent = player.name;
        btn.dataset.playerName = player.name;
        btn.addEventListener('click', () => {
            container.querySelectorAll('.player-select-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            onSelect(player.name);
        });
        container.appendChild(btn);
    });

    elements.playerSelectOverlay.classList.add('active');
}

export function hidePlayerSelect() {
    elements.playerSelectOverlay.classList.remove('active');
}

export function renderInputArea(alivePlayers, onJokerClick) {
    elements.inputArea.innerHTML = '';
    alivePlayers.forEach(player => {
        const container = document.createElement('div');
        container.className = 'player-input-container';
        container.dataset.playerName = player.name;

        const group = document.createElement('div');
        group.className = 'player-input-group';
        
        const playerState = gameState.players.find(p => p.name === player.name);
        const hasUsedJoker = playerState ? playerState.hasUsedJoker : false;

        group.innerHTML = `
            <label for="player-${player.name}">${player.name}:</label>
            <input type="password" id="player-${player.name}" required placeholder="***" autocomplete="off" inputmode="numeric" pattern="[0-9]*">
            <button class="joker-btn" data-player="${player.name}" ${hasUsedJoker ? 'disabled' : ''}>
                ${hasUsedJoker ? '使用済み' : 'JOKER'}
            </button>
        `;
        container.appendChild(group);
        elements.inputArea.appendChild(container);
        
        const jokerBtn = group.querySelector('.joker-btn');
        if (!jokerBtn.disabled) {
            jokerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onJokerClick(player.name);
            });
        }
    });
}

export function updateControllableView() {
    const containers = document.querySelectorAll('.player-input-container');
    containers.forEach(container => {
        if (container.dataset.playerName === gameState.currentUser) {
            container.classList.add('is-controllable');
            container.classList.remove('is-locked');
        } else {
            container.classList.add('is-locked');
            container.classList.remove('is-controllable');
        }
    });
}

export function updateRuleDisplay(aliveCount, currentRound) {
    if (aliveCount === 4 && currentRound >= 5) {
        elements.currentRule.textContent = '特別ルール【天啓】：ターゲットが素数だった場合、その数字を提出した者は無条件で勝利。他は-2点。';
        return;
    }
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
    
    // 見やすさのため、提出内容のテキストを整形
    elements.chosenNumbers.textContent = result.inputs.map(p => {
        const numberDisplay = p.number === 'JOKER' ? 'JOKER' : (isNaN(p.number) ? '未入力' : p.number);
        return `${p.name}: ${numberDisplay}`;
    }).join(' / ');
    
    if (result.specialRuleMessage) {
        elements.averageValue.textContent = '---';
        elements.targetCalculationText.innerHTML = `<strong>${result.specialRuleMessage}</strong>`;
    } else if (isNaN(result.average)) {
        elements.averageValue.textContent = '計算不能';
        elements.targetCalculationText.innerHTML = `ターゲット: ---`;
    } else {
        elements.averageValue.textContent = result.average.toFixed(3);
        elements.targetCalculationText.innerHTML = `ターゲット (平均値 × ${result.multiplier}): <strong>${result.target.toFixed(3)}</strong>`;
    }
    
    elements.roundWinner.textContent = result.winners.length > 0 ? `勝者: ${result.winners.join(', ')}` : '勝者なし';
    
    renderScoreboard('resultScoreboard');
    
    // *** 変更点：勝者のスコアカードに 'winner' クラスを付けてハイライトする ***
    if (result.winners.length > 0) {
        const cards = document.querySelectorAll('#result-scoreboard .score-card');
        cards.forEach(card => {
            const nameEl = card.querySelector('.name');
            if (nameEl && result.winners.includes(nameEl.textContent)) {
                card.classList.add('winner');
            }
        });
    }
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
