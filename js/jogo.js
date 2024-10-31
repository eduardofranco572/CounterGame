let players = JSON.parse(localStorage.getItem('Players')) || [];
let vezDe = 0, qtdCartas = 1, direcaoCartas = 1;
let vetQtdFaz = [], vetQtdFez = [];
let gameState = 'inicial';

const showElement = selector => $(selector).css('display', 'flex');
const hideElement = selector => $(selector).css('display', 'none');
const updateLocalStorage = () => localStorage.setItem('Players', JSON.stringify(players));

function toggleCard(selector, show = true) { 
    show ? showElement(selector) : hideElement(selector);
}

$(document).ready(function() {
    loadWallpaper();
});

function renderPlayers() {
    $('.Jogadores').empty();
    players.forEach((player, index) => {
        const playerClass = player.ativo ? "player" : "player playerDead";
        const playerHTML = `
            <div class="${playerClass}" data-index="${index}">
                <div class="deletar"><span class="material-symbols-outlined deleteBtn">delete</span></div>
                <div class="infos">
                    <div class="fun">
                        <h1 class="namePlayer">${player.name}</h1>
                        <div class="qtds"><span class="material-symbols-outlined">favorite</span><h1>${player.vida}</h1></div>
                        <div class="qtdsFaz">
                            <p class="titleBtn">Qtd faz?</p>
                            <div class='agrupabtn'>
                                <button class="removeBtn" data-target="countFaz${index}"><span class="material-symbols-outlined">remove</span></button>
                                <h1 id="countFaz${index}">0</h1>
                                <button class="addBtn" data-target="countFaz${index}"><span class="material-symbols-outlined">add</span></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        $('.Jogadores').append(playerHTML);
    });

    const sortable = new Sortable(document.querySelector('.Jogadores'), {
        animation: 150,
        onEnd: updatePlayerOrder 
    });
}

function updatePlayerOrder(event) {
    const newIndex = event.newIndex; 
    const oldIndex = event.oldIndex;

    const movedPlayer = players.splice(oldIndex, 1)[0];
    players.splice(newIndex, 0, movedPlayer);

    updateLocalStorage();
    renderPlayers();
}

function updateCount(targetId, operador) {
    let count = parseInt($(`#${targetId}`).text());
    count = operador === "add" ? count + 1 : Math.max(count - 1, 0);
    $(`#${targetId}`).text(count);
}

function resetCounts() {
    $('.Jogadores .qtdsFaz h1').each(function () {
        $(this).text('0');
    });
}

function handleRoundEnd() {
    if (gameState === 'inicial') {
        toggleCard('.cardAddRounds');
        toggleOpacity(true);
        $('#nomeplayerview').html(players[vezDe].name);
        $('#qtdCartas').html(qtdCartas);

        $('#startGame').html('Próximo');
        gameState = 'jogando';
    } 
    else if (gameState === 'jogando') {
        $('.Jogadores .qtdsFaz h1').each(function () {
            vetQtdFaz.push(parseInt($(this).text()));
        });

        $('#startGame').html('Finalizar Round');
        $('.titleBtn').html('Qtd fez?').addClass("animaTroca");
        gameState = 'finalizando'; 
    } 
    else if (gameState === 'finalizando') {
        $('.Jogadores .qtdsFaz h1').each(function () {
            vetQtdFez.push(parseInt($(this).text()));
        });

        updateLifePoints();
        vetQtdFaz = [];
        vetQtdFez = []; 

        $('#startGame').html('Começar');
        gameState = 'inicial';

        setNextPlayer();
    }

    resetCounts();
}

function setNextPlayer() {
    const totalJogadores = players.length;

    do {
        vezDe = (vezDe + 1) % totalJogadores;
    } while (!players[vezDe].ativo); 

    $('#nomeplayerview').html(players[vezDe].name);
    $('#qtdCartas').html(qtdCartas);

    if ((qtdCartas + direcaoCartas) * players.filter(player => player.ativo).length > 40) {
        direcaoCartas = -1;
        qtdCartas--;
    } else if (qtdCartas <= 1 && direcaoCartas === -1) {
        direcaoCartas = 1;
        qtdCartas++;
    } else {
        qtdCartas += direcaoCartas;
    }
}

$("#playButton").on('click', function (event) {
    event.preventDefault();
    toggleCard('.cardAddRounds', false);
    toggleOpacity(false);
});

renderPlayers();

function resetGame() {
    players = players.map(player => ({
        ...player,
        vida: "5",  
        ativo: true
    }));

    qtdCartas = 1;
    vezDe = 0;

    updateLocalStorage();
    renderPlayers();

    $('#startGame').html('Começar');
}

function updateLifePoints() {
    let alivePlayers = 0;
    let lastTwoPlayers = [];
    let deadPlayers = [];

    players.forEach((player, index) => {
        if (player.ativo) {
            alivePlayers++;
            lastTwoPlayers.push(index);
        }
    });

    if (alivePlayers === 2) {
        const faz1 = vetQtdFaz[lastTwoPlayers[0]] || 0;
        const fez1 = vetQtdFez[lastTwoPlayers[0]] || 0;
        const faz2 = vetQtdFaz[lastTwoPlayers[1]] || 0;
        const fez2 = vetQtdFez[lastTwoPlayers[1]] || 0;

        if (faz1 !== fez1 && faz2 !== fez2) {
            Swal.fire("Empate! Ambos os jogadores ficam com 1 de vida.");

            players = players.map((player, index) => {
                if (lastTwoPlayers.includes(index)) {
                    return {
                        ...player,
                        vida: "1",
                        ativo: true
                    };
                }
                return player;
            });
            updateLocalStorage();
            renderPlayers();
            return;
        }
    }

    players = players.map((player, index) => {
        if (!player.ativo) return player;

        const faz = vetQtdFaz[index] || 0;
        const fez = vetQtdFez[index] || 0;
        let vidaAtualizada = parseInt(player.vida);

        if (faz !== fez) {
            vidaAtualizada -= Math.abs(faz - fez);
        }

        if (vidaAtualizada <= 0) {
            vidaAtualizada = 0;
            player.ativo = false;
            deadPlayers.push(player.name);
            qtdCartas = 1;
        }

        return {
            ...player,
            vida: vidaAtualizada.toString(),
            ativo: player.ativo
        };
    });

    deadPlayers.reduce((prevPromise, playerName) => {
        return prevPromise.then(() => Swal.fire(`${playerName} morreu!`));
    }, Promise.resolve()).then(() => {
        alivePlayers = players.filter(player => player.ativo).length;
        if (alivePlayers === 1) {
            const winner = players.find(player => player.ativo);
            Swal.fire(`${winner.name} Ganhou!`).then(() => {
                resetGame();
            });
        } else {
            updateLocalStorage();
            renderPlayers();
        }
    });
}

const actions = {
    '.addPlayer': { card: '.cardAddPlayer', opacity: true },
    '.addVida': { card: '.cardAddVida', opacity: true },
    '.btnPassaTurno': { handler: handleRoundEnd },
    '.ordenarPlyers': { card: '.cardOrdenarPlayers', opacity: true, handler: loadTableData },
    '.trocarWallpaper': { card: '.cardTrocarWallpaper', opacity: true },
    '.fechar': { card: '.cardAddPlayer', opacity: false },
    '.fecharVida': { card: '.cardAddVida', opacity: false },
    '.fecharGame': { card: '.cardAddRounds', opacity: false },
    '.fecharOrdenar': { card: '.cardOrdenarPlayers', opacity: false },
    '.fecharTW': { card: '.cardTrocarWallpaper', opacity: false },
};

function toggleCardAndOpacity(selector, show) {
    toggleCard(selector, show);
    toggleOpacity(show);
}

$.each(actions, (selector, config) => {
    $(selector).on('click', function () {
        if (config.card) toggleCardAndOpacity(config.card, config.opacity);
        if (config.handler) config.handler();
    });
});

function loadWallpaper() {
    const wallpaperUrl = localStorage.getItem('wallpaperUrl');
    if (wallpaperUrl) {
        $('body').css({
            'background-image': `url(${wallpaperUrl})`,
            'background-size': 'cover',
        });
    }
}

$('#trocaWall').on('click', function (e) {
    e.preventDefault();
    const url = $('#url').val();
    if (url) {
        $('body').css({
            'background-image': `url(${url})`,
            'background-size': 'cover',
        });
        localStorage.setItem('wallpaperUrl', url);
    }
});

function toggleOpacity(show) {
    $('.opacid').css('opacity', show ? '0.2' : '1');
}

$('.Jogadores').on('click', '.deleteBtn', function() {
    players.splice($(this).closest('.player').data('index'), 1);
    updateLocalStorage();
    renderPlayers();
});

$('.Jogadores').on('click', '.addBtn', function() {
    updateCount($(this).data('target'), 'add');
});

$('.Jogadores').on('click', '.removeBtn', function() {
    updateCount($(this).data('target'), 'remove');
});


$('.restartGame').on('click', function () {
    players = players.map((player, index) => {
        return { 
            ...player, 
            vida: '5',
            ativo: true 
        };
    });

    vezDe = 0; 
    qtdCartas = 1;
    direcaoCartas = 1;
    vetQtdFaz = []; 
    vetQtdFez = [];
    gameState = 'inicial';
   
    updateLocalStorage();
    renderPlayers();
});

$("#AdicionaOplayer").on('click', function (event) {
    event.preventDefault();
    players.push({ 
        name: $("#nameInput").val(), 
        vida: '5',
        ativo: true 
    });
    updateLocalStorage();
    $("#nameInput").val('');
    renderPlayers();
});

$("#AdicionaVida").on('click', function (event) {
    event.preventDefault();
    const newVida = $("#vidaInput").val();
    if (newVida) {
        players = players.map(player => ({ 
            ...player, 
            vida: newVida 
        }));
        updateLocalStorage();
    }
    $("#vidaInput").val('');
    renderPlayers();
}); 

const sortableTable = new Sortable(document.querySelector('#playersTable tbody'), {
    animation: 150,
    onEnd: () => {
        console.log('Ordem alterada, clique em Salvar Ordem para aplicar.');
    }
});

function loadTableData() {
    const tbody = $('#playersTable tbody');
    tbody.empty();
    players.forEach((player, index) => {
        const rowHTML = `
            <tr data-index="${index}">
                <td>${player.name}</td>
                <td>${player.vida}</td>
            </tr>`;
        tbody.append(rowHTML);
    });
}

$('#salvarOrdem').on('click', function() {
    const newOrder = [];
    $('#playersTable tbody tr').each(function() {
        const playerIndex = $(this).data('index');
        newOrder.push(players[playerIndex]);
    });
    players = newOrder;
    updateLocalStorage();  
    renderPlayers();       
});
