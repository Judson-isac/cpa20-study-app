// Adicione esta variável no topo do seu script.js
let currentVideoContext = {
    moduleFiles: [],
    currentIndex: -1
};

// No topo do seu script, garanta que esta constante exista:
const DEFAULT_AVATAR = 'default-avatar.png'; // Certifique-se de que este arquivo de imagem existe na sua pasta raiz.

// FUNÇÕES AUXILIARES PARA O PROGRESSO DOS ESTUDOS (VERSÃO FINAL)
const getCompletedItems = (userId) => {
    const data = localStorage.getItem(`completedItems_${userId}`);
    return data ? new Set(JSON.parse(data)) : new Set();
};

const markItemAsCompleted = (userId, itemId) => {
    const completed = getCompletedItems(userId);
    completed.add(itemId);
    localStorage.setItem(`completedItems_${userId}`, JSON.stringify(Array.from(completed)));
};

const isItemCompleted = (userId, itemId) => {
    return getCompletedItems(userId).has(itemId);
};

document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores de Elementos do DOM ---
    const loginSection = document.getElementById('login-section');
    const appContainer = document.getElementById('app-container');
    const simuladoSelectionSection = document.getElementById('simulado-selection-section');
    const questionsSection = document.getElementById('questions-section');
    const resultsSection = document.getElementById('results-section');
    const reviewSection = document.getElementById('review-section');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const loginMessage = document.getElementById('login-message');
    const logoutButton = document.getElementById('logout-button');
    const welcomeMessage = document.getElementById('welcome-message');
    const simuladosListContainer = document.getElementById('simulados-list-container');
    const questionHeader = document.getElementById('question-header');
    const currentQuestionContainer = document.getElementById('current-question-container');
    const questionNavigator = document.getElementById('question-navigator');
    const prevBtn = document.getElementById('prev-question-btn');
    const nextBtn = document.getElementById('next-question-btn');
    const finishBtn = document.getElementById('finish-simulado-btn');
    const sidebarFinishBtn = document.getElementById('sidebar-finish-btn');
    const questionCounter = document.getElementById('question-counter');
    const backToSelectionButton = document.getElementById('back-to-selection-button');
    const reviewErrorsButton = document.getElementById('review-errors-button');
    const percentageCircle = document.getElementById('percentage-circle');
    const percentageValueSpan = document.getElementById('percentage-value');
    const correctAnswersSpan = document.getElementById('correct-answers');
    const incorrectAnswersLast = document.getElementById('incorrect-answers-last');
    const totalQuestionsLastSpan = document.getElementById('total-questions-last');
    const evolutionChartCanvas = document.getElementById('evolutionChart').getContext('2d');
    const avgPercentageSpan = document.getElementById('average-percentage-value');
    const bestScoreSpan = document.getElementById('best-score-value');
    const totalAttemptsSpan = document.getElementById('total-attempts-value');
    const achievementsContainer = document.getElementById('achievements-container');
    const historyTableBody = document.querySelector('#previous-attempts tbody');
    const reviewTitle = document.getElementById('review-title');
    const reviewContainer = document.getElementById('review-container');
    const startRedoErrorsBtn = document.getElementById('start-redo-errors-btn');
    const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
    const rankingPodium = document.getElementById('ranking-podium');
    const rankingList = document.getElementById('ranking-list');
    // ADICIONADO: Seletores para os elementos da janela modal de revisão
    const reviewModalSummary = document.getElementById('reviewModalSummary');
    const reviewModalValue = document.getElementById('reviewModalValue');
    const reviewModalCircle = document.getElementById('reviewModalCircle');
    const reviewModalMessage = document.getElementById('reviewModalMessage');
    const reviewModalOverlay = document.getElementById('reviewModalOverlay');

    // NOVOS: Seletores para a aba de estudos e player de vídeo
    const studyButton = document.getElementById('study-button');
    const studySection = document.getElementById('study-section'); // Adicionado
    const modulesListContainer = document.getElementById('modules-list-container');
    const studyVideoPlayer = document.getElementById('study-video-player'); // Adicionado
    const videoTitle = document.getElementById('video-title'); // Adicionado
    const backToStudyModulesButton = document.getElementById('back-to-study-modules-button'); // Adicionado
    const videoPlayerSection = document.getElementById('video-player-section'); // Adicionado

    // ADICIONADO: Seletores para o upload de avatar
    const userAvatarImg = document.getElementById('user-avatar-img');
    const avatarUploadInput = document.getElementById('avatar-upload-input');

    // ADICIONADO: Seletor para o botão de tema
    const themeToggleBtn = document.getElementById('theme-toggle-btn');

    // GARANTA que esta função exista no seu script.js
    const showReviewModal = (result) => {
        const p = result.percentage;
        reviewModalSummary.innerHTML = `Você corrigiu <strong>${result.correct}</strong> de <strong>${result.total}</strong> erros.`;
        reviewModalValue.textContent = `${p.toFixed(0)}%`;
        let color = p === 100 ? 'var(--green)' : (p >= 70 ? 'var(--yellow)' : 'var(--red)');
        reviewModalCircle.style.background = `conic-gradient(${color} 0% ${p}%, #e9ecef ${p}% 100%)`;
        if (p === 100) reviewModalMessage.textContent = "Perfeito! Você dominou suas dificuldades.";
        else if (p >= 70) reviewModalMessage.textContent = "Excelente progresso! Continue assim.";
        else reviewModalMessage.textContent = "A revisão é o caminho. Não desista!";
        reviewModalOverlay.classList.add('visible');
    };

    // --- Variáveis e Constantes de Estado ---
    let loggedInUser = null;
    let userId = null; // Para guardar o ID do usuário logado
    let currentSimulado = null;
    let userAnswers = {};
    let evolutionChart = null;
    let currentQuestionIndex = 0;
    let attemptToReview = null;
    let previousResults = [];
    const ALL_ACHIEVEMENTS = {
        'persistent': { title: 'Persistente', description: 'Faça 5 simulados', icon: 'bi-gem' },
        'focused': { title: 'Focado', description: 'Complete uma revisão de erros', icon: 'bi-bullseye' },
        'approved': { title: 'Aprovado!', description: 'Atinja 70% em um simulado', icon: 'bi-patch-check-fill' },
        'invincible': { title: 'Invencível', description: 'Atinja 100% em um simulado', icon: 'bi-trophy-fill' }
    };
    const SIMULADO_FILES = ['simulado1', 'simulado2', 'simulado3', 'simulado4', 'simulado5', 'simulado6', 'simulado7'];

    // Mapeamento de simulados para links de vídeo de correção do Google Drive
    const SIMULADO_CORRECTION_LINKS = {
        'simulado1': 'https://drive.google.com/file/d/1NkQPsV8M9LOEPrcV3hSOv4isA-n7h5hd/preview', // Link do Simulado 1
        'simulado2': 'https://drive.google.com/file/d/1oDU6WU6abqBWSINr4USoKrHObP4aPvBD/preview', // Link do Simulado 2
        'simulado3': 'https://drive.google.com/file/d/19I4iBq8fIjcONrfRM8Ng5hKJZmmhh9nB/preview', // Link do Simulado 3
        'simulado4': 'https://drive.google.com/file/d/1P38hfpSnsb8mXMt-eXEAHgZ8e_LF8fwY/preview', // Link do Simulado 4
        'simulado5': 'https://drive.google.com/file/d/1N5xSOQU7riKH_cJRWyjtMa_BT8zgNGiM/preview', // Link do Simulado 5
        'simulado6': 'https://drive.google.com/file/d/1kidR1LFXAueRyuNxT2XCHb8i-ntS_HHy/preview', // Link do Simulado 6
        // Adicione os links dos outros simulados aqui:
        // 'simulado7': 'LINK_DO_SIMULADO_7',
        // ...
    };

    // --- Funções de Lógica Principal ---
    const showScreen = (screenName) => {
        [loginSection, appContainer, simuladoSelectionSection, questionsSection, resultsSection, reviewSection, studySection, videoPlayerSection].forEach(el => el.style.display = 'none');
        if (screenName === 'login') loginSection.style.display = 'flex';
        else {
            appContainer.style.display = 'block';
            if (screenName === 'selection') {
                renderSimuladoSelection();
                simuladoSelectionSection.style.display = 'block';
            } else if (screenName === 'questions') questionsSection.style.display = 'block';
            else if (screenName === 'results') resultsSection.style.display = 'block';
            else if (screenName === 'review') reviewSection.style.display = 'block';
            else if (screenName === 'study') {
                renderStudyMaterials();
                studySection.style.display = 'block';
            } else if (screenName === 'video') { // Adicionado para a tela de vídeo (usada para estudos e correções)
                videoPlayerSection.style.display = 'block';
            }
        }
    };

    // MODIFICADO: handleLogin para carregar o avatar
    const handleLogin = async () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        if (!username || !password) { loginMessage.textContent = 'Por favor, preencha usuário e senha.'; return; }
        try {
            const response = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
            const data = await response.json();
            if (data.success) {
                loggedInUser = data.username;
                userId = data.userId; // SALVA O ID DO USUÁRIO
                localStorage.setItem('cpa20LoggedInUser', loggedInUser);
                localStorage.setItem('cpa20UserId', userId); // Salva no localStorage também

                const avatarUrl = data.avatar || DEFAULT_AVATAR; // Usa a imagem padrão se não houver avatar
                localStorage.setItem('cpa20UserAvatar', avatarUrl); // Salva o caminho (pode ser o padrão)
                userAvatarImg.src = avatarUrl; // MOSTRA A IMAGEM DO AVATAR

                // AGORA, CARREGA OS DADOS DO SERVIDOR
                await loadAttemptsFromServer();

                welcomeMessage.textContent = `Olá, ${loggedInUser}!`;
                (previousResults.length > 0) ? (renderDashboard(), showScreen('results')) : showScreen('selection');
            } else loginMessage.textContent = data.message || 'Erro no login.';
        } catch (error) { loginMessage.textContent = 'Erro ao conectar com o servidor.'; }
    };
    const handleRegister = async () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        if (!username || !password) { loginMessage.textContent = 'Preencha usuário e senha para cadastrar.'; return; }
        try {
            const response = await fetch('/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
            const data = await response.json();
            loginMessage.textContent = data.message;
            if (data.success) { usernameInput.value = ''; passwordInput.value = ''; }
        } catch (error) { loginMessage.textContent = 'Erro ao conectar com o servidor.'; }
    };
    const handleLogout = () => { localStorage.removeItem('cpa20LoggedInUser'); localStorage.removeItem('cpa20UserId'); localStorage.removeItem('cpa20UserAvatar'); loggedInUser = null; userId = null; previousResults = []; userAvatarImg.src = DEFAULT_AVATAR; showScreen('login'); };

    const startSimulado = async (simuladoKey) => {
        try {
            const response = await fetch(`${simuladoKey}.json`);
            if (!response.ok) throw new Error('Falha ao carregar o simulado.');
            const data = await response.json();
            currentSimulado = { name: simuladoKey, questions: data.questions, gabarito: data.questions.reduce((acc, q) => ({ ...acc, [q.id]: q.answer }), {}) };
            userAnswers = {};

            // Remove a lógica de vídeo de correção daqui, pois será na tela de seleção

            displayQuestions();
            showScreen('questions');
        } catch (error) { alert(error.message); }
    };
    const handleFinishAttempt = () => {
        if (currentSimulado && currentSimulado.isReview) { handleSubmit(); return; }
        if (confirm('Você tem certeza que deseja finalizar? Questões não respondidas serão contadas como erradas.')) handleSubmit();
    };

    // ADICIONADO: Função para carregar os dados do servidor
    const loadAttemptsFromServer = async () => {
        if (!userId) return;
        try {
            const response = await fetch('/attempts/load', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            const data = await response.json();
            if (data.success) {
                // Certifica-se de que userAnswers está sendo carregado
                previousResults = data.results.map(attempt => ({
                    ...attempt,
                    userAnswers: attempt.userAnswers || {} // Garante que userAnswers é um objeto
                }));
            } else {
                previousResults = [];
            }
        } catch (error) {
            console.error("Erro ao carregar tentativas:", error);
            previousResults = [];
        }
    };

    // FUNÇÃO TOTALMENTE CORRIGIDA E MELHORADA
    const handleSubmit = async () => {
        // --- LÓGICA PARA O MODO "REFAZER ERROS" (permanece a mesma) ---
        if (currentSimulado && currentSimulado.isReview) {
            let correctCount = 0;
            const totalQuestions = currentSimulado.questions.length;

            for (const qId in currentSimulado.gabarito) {
                if (userAnswers[qId] === currentSimulado.gabarito[qId]) {
                    correctCount++;
                }
            }

            const reviewResult = {
                correct: correctCount,
                total: totalQuestions,
                percentage: totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0
            };

            showReviewModal(reviewResult);

            let unlocked = JSON.parse(localStorage.getItem(`achievements_${loggedInUser}`)) || {};
            if (!unlocked['focused']) {
                unlocked['focused'] = true;
                localStorage.setItem(`achievements_${loggedInUser}`, JSON.stringify(unlocked));
            }

            renderDashboard();
            showScreen('results');
            return;
        }

        // --- LÓGICA PARA UM SIMULADO NORMAL ---
        let correct = 0;
        const total = currentSimulado.questions.length;
        for (const questionId in currentSimulado.gabarito) {
            if (userAnswers[questionId] === currentSimulado.gabarito[questionId]) {
                correct++;
            }
        }

        const result = {
            id: Date.now(), // ID Temporário, será substituído pelo ID do servidor
            simulado: currentSimulado.name,
            date: new Date().toLocaleString('pt-BR'),
            correct,
            total,
            percentage: ((correct / total) * 100).toFixed(2),
            userAnswers: userAnswers // Importante para salvar as respostas
        };

        // Envia o resultado para o servidor
        try {
            const response = await fetch('/attempts/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    simuladoKey: currentSimulado.name,
                    correct: result.correct,
                    total: result.total,
                    percentage: parseFloat(result.percentage),
                    userAnswers: result.userAnswers // CORREÇÃO PASSO 1: Enviando as respostas
                })
            });

            const saveData = await response.json(); // Pega a resposta do servidor
            // CORREÇÃO PASSO 2: Atualiza o ID local com o ID real do banco de dados
            if (saveData.success && saveData.attemptId) {
                result.id = saveData.attemptId;
            }

        } catch (error) {
            console.error("Erro ao salvar tentativa no servidor:", error);
            // Opcional: Adicionar mensagem de erro para o usuário
        }

        // Atualiza a UI com o resultado (agora com o ID correto)
        previousResults.push(result);
        checkAchievements(result);
        renderDashboard();
        showScreen('results');
    };

    const renderQuestionInterface = () => { renderCurrentQuestion(); renderQuestionNavigator(); updateNavigationControls(); };
    const renderCurrentQuestion = () => { const q = currentSimulado.questions[currentQuestionIndex]; currentQuestionContainer.innerHTML = `<div class="question"><p><b>Questão ${currentQuestionIndex + 1}:</b> ${q.question.replace(/(?<!^)(I\.|II\.|III\.)/g, '<br>$1')}</p><div class="options-container">${q.options.map((opt, index) => { const letter = String.fromCharCode(97 + index); const isChecked = userAnswers[q.id] === letter ? 'checked' : ''; const isSelectedClass = userAnswers[q.id] === letter ? 'selected' : ''; return `<label class="option ${isSelectedClass}" data-question-id="${q.id}" data-option-value="${letter}"><input type="radio" name="q_${q.id}" value="${letter}" ${isChecked}><b>${letter.toUpperCase()})</b> ${opt}</label>`; }).join('')}</div></div>`; };
    const renderQuestionNavigator = () => { questionNavigator.innerHTML = ''; currentSimulado.questions.forEach((q, index) => { const btn = document.createElement('button'); btn.className = 'nav-question-btn'; btn.textContent = index + 1; btn.dataset.index = index; if (userAnswers[q.id]) btn.classList.add('answered'); if (index === currentQuestionIndex) btn.classList.add('current'); questionNavigator.appendChild(btn); }); };
    const updateNavigationControls = () => { prevBtn.disabled = currentQuestionIndex === 0; nextBtn.style.display = (currentQuestionIndex === currentSimulado.questions.length - 1) ? 'none' : 'inline-block'; finishBtn.style.display = (currentQuestionIndex === currentSimulado.questions.length - 1) ? 'inline-block' : 'none'; questionCounter.textContent = `Questão ${currentQuestionIndex + 1} de ${currentSimulado.questions.length}`; };
    const displayQuestions = () => { questionHeader.textContent = `Simulado: ${currentSimulado.name}`; currentQuestionIndex = 0; renderQuestionInterface(); };

    // Função para iniciar a revisão do gabarito (usando dados carregados)
    const startGabaritoReview = async (attemptId) => {
        attemptToReview = previousResults.find(r => r.id === attemptId);
        if (!attemptToReview) {
            console.error("Tentativa para revisar não encontrada:", attemptId);
            alert("Não foi possível encontrar os dados desta tentativa. Tente recarregar a página.");
            return;
        }

        try {
            const response = await fetch(`${attemptToReview.simulado}.json`);
            if (!response.ok) throw new Error('Falha ao carregar dados do simulado.');
            const data = await response.json();

            reviewTitle.textContent = `Revisão do ${attemptToReview.simulado}`;
            reviewContainer.innerHTML = ''; // Limpa o container

            const gabarito = data.questions.reduce((acc, q) => ({ ...acc, [q.id]: q.answer }), {});
            const incorrectCount = attemptToReview.total - attemptToReview.correct;
            startRedoErrorsBtn.style.display = incorrectCount > 0 ? 'block' : 'none';

            data.questions.forEach(q => {
                // Usa as respostas do usuário carregadas do servidor
                const userAnswer = attemptToReview.userAnswers ? attemptToReview.userAnswers[q.id] : undefined;
                const correctAnswer = gabarito[q.id];
                const isCorrect = userAnswer === correctAnswer;

                const itemCard = document.createElement('div');
                itemCard.className = `review-question-card ${isCorrect ? 'status-correct' : 'status-incorrect'}`;

                let optionsHTML = q.options.map((opt, index) => {
                    const letter = String.fromCharCode(97 + index);
                    let optionClass = 'review-option-item';
                    let iconHTML = '';

                    // Lógica de feedback:
                    if (letter === correctAnswer) {
                        optionClass += ' is-correct-answer';
                        iconHTML = `<i class="feedback-icon icon-correct-mark bi bi-check-circle-fill"></i>`;
                    }
                    else if (letter === userAnswer && !isCorrect) {
                        optionClass += ' is-user-wrong-choice';
                        iconHTML = `<i class="feedback-icon icon-wrong-mark bi bi-x-circle-fill"></i>`;
                    }

                    return `<div class="${optionClass}">
                                ${iconHTML}
                                <span><b>${letter.toUpperCase()})</b> ${opt}</span>
                            </div>`;
                }).join('');

                itemCard.innerHTML = `
                    <p class="question-title-text"><b>Questão ${q.id}:</b> ${q.question}</p>
                    <div>${optionsHTML}</div>
                `;
                reviewContainer.appendChild(itemCard);
            });

            showScreen('review');
        } catch (error) {
            alert(error.message);
        }
    };

    const startRedoErrorsMode = async () => {
        if (!attemptToReview) return;
        try {
            const response = await fetch(`${attemptToReview.simulado}.json`);
            if (!response.ok) throw new Error('Falha ao carregar dados do simulado.');
            const data = await response.json();
            const originalQuestions = data.questions; const gabarito = originalQuestions.reduce((acc, q) => ({ ...acc, [q.id]: q.answer }), {});
            // Filtra as questões que o usuário errou na tentativa revisada
            const errorQuestions = originalQuestions.filter(q => attemptToReview.userAnswers[q.id] !== gabarito[q.id]);
            // CORREÇÃO: Corrigido o erro de sintaxe no reduce
            currentSimulado = { name: `${attemptToReview.simulado} (Refazendo Erros)`, questions: errorQuestions, gabarito: errorQuestions.reduce((acc, q) => ({ ...acc, [q.id]: q.answer }), {}), isReview: true };
            userAnswers = {}; // Começa com respostas vazias para a nova tentativa
            displayQuestions();
            showScreen('questions');
        } catch (error) { alert(error.message); }
    };

    const generateAvatarColor = (username) => {
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            let value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    };

    const getLeague = (score) => {
        const s = parseFloat(score);
        if (s >= 95) return { name: 'Mestre', class: 'league-master' };
        if (s >= 80) return { name: 'Diamante', class: 'league-diamond' };
        if (s >= 60) return { name: 'Ouro', class: 'league-gold' };
        if (s >= 40) return { name: 'Prata', class: 'league-silver' };
        return { name: 'Bronze', class: 'league-bronze' };
    };

    const renderRanking = async () => {
        try {
            const response = await fetch('/ranking');
            const data = await response.json();

            const listContainer = document.getElementById('ranking-list');
            const podiumContainer = document.getElementById('ranking-podium'); // Se você ainda usa pódio

            if (data.success && data.ranking.length > 0) {
                if (podiumContainer) podiumContainer.innerHTML = '';
                if (listContainer) listContainer.innerHTML = '';

                const medals = { 1: 'bi-trophy-fill', 2: 'bi-award-fill', 3: 'bi-medal-fill' };

                data.ranking.forEach((user, index) => {
                    const rank = index + 1;
                    const isTop3 = rank <= 3;
                    const isCurrentUser = user.username === loggedInUser;
                    const score = parseFloat(user.average_score);
                    const avatarUrl = user.avatar || DEFAULT_AVATAR;

                    const li = document.createElement('li');
                    li.className = 'ranking-item';
                    if (isTop3) li.classList.add(`rank-${rank}`);
                    if (isCurrentUser) li.classList.add('current-user-rank');
                    li.style.animationDelay = `${index * 0.1}s`;

                    const rankHTML = isTop3 ? `<i class="bi ${medals[rank]} medal-icon"></i>` : `<span class="rank-number">${rank}º</span>`;

                    li.innerHTML = `
                        <div class="rank-position">${rankHTML}</div>
                        <div class="list-avatar-wrapper">
                            <img src="${avatarUrl}" alt="Avatar de ${user.username}" onerror="this.src='${DEFAULT_AVATAR}'">
                        </div>
                        <div class="player-info">
                            <div class="username">${user.username}</div>
                            <div class="progress-bar-container">
                                <div class="progress-bar" style="width: ${score}%;"></div>
                            </div>
                        </div>
                        <div class="score">${score.toFixed(2)}%</div>
                    `;

                    if (listContainer) listContainer.appendChild(li);
                });
            } else {
                if (listContainer) listContainer.innerHTML = '<li>Ainda não há dados suficientes para o ranking.</li>';
            }
        } catch (error) {
            console.error("Erro ao carregar ranking:", error);
            if (document.getElementById('ranking-list')) document.getElementById('ranking-list').innerHTML = '<li>Não foi possível carregar o ranking.</li>';
        }
    };

    const renderDashboard = () => {
        if (previousResults.length === 0) { showScreen('selection'); return; }
        const lastResult = previousResults[previousResults.length - 1];
        const p = parseFloat(lastResult.percentage);
        let color; if (p < 50) color = 'var(--red)'; else if (p < 70) color = 'var(--yellow)'; else color = 'var(--green)';
        percentageValueSpan.textContent = `${p.toFixed(0)}%`; percentageCircle.style.background = `conic-gradient(${color} 0% ${p}%, #e9ecef ${p}% 100%)`;
        correctAnswersSpan.textContent = lastResult.correct;
        incorrectAnswersLast.textContent = lastResult.total - lastResult.correct;
        totalQuestionsLastSpan.textContent = lastResult.total;
        reviewErrorsButton.style.display = previousResults.some(r => r.total - r.correct > 0) ? 'inline-block' : 'none';

        const totalAttempts = previousResults.length;
        const totalPercentage = previousResults.reduce((sum, r) => sum + parseFloat(r.percentage), 0);
        const avgPercentage = totalAttempts > 0 ? totalPercentage / totalAttempts : 0;
        const bestScore = totalAttempts > 0 ? Math.max(...previousResults.map(r => parseFloat(r.percentage))) : 0;
        avgPercentageSpan.textContent = `${avgPercentage.toFixed(2)}%`;
        bestScoreSpan.textContent = `${bestScore.toFixed(2)}%`;
        totalAttemptsSpan.textContent = totalAttempts;
        updateEvolutionChart();
        updateHistoryTable();
        renderAchievements();
        renderRanking();
    };
    const updateEvolutionChart = () => {
        const labels = previousResults.map((_, index) => `Sim. ${index + 1}`);
        const data = previousResults.map(r => parseFloat(r.percentage));
        if (evolutionChart) evolutionChart.destroy();
        evolutionChart = new Chart(evolutionChartCanvas, { type: 'line', data: { labels, datasets: [{ label: 'Desempenho (%)', data, borderColor: 'var(--primary-color)', backgroundColor: 'rgba(0, 123, 255, 0.1)', fill: true, tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } } });
    };
    const updateHistoryTable = () => {
        historyTableBody.innerHTML = '';
        if (previousResults.length === 0) return;

        const attemptsBySimulado = previousResults.reduce((acc, attempt) => {
            if (!acc[attempt.simulado]) acc[attempt.simulado] = [];
            acc[attempt.simulado].push(attempt);
            return acc;
        }, {});

        const bestAttempts = Object.values(attemptsBySimulado).map(group => {
            const best = group.reduce((b, c) => parseFloat(c.percentage) > parseFloat(b.percentage) ? c : b);
            best.totalAttemptsInGroup = group.length;
            return best;
        });

        bestAttempts.sort((a, b) => new Date(b.date) - new Date(a.date));

        bestAttempts.forEach(attempt => {
            const p = parseFloat(attempt.percentage);
            let badgeClass;
            if (p < 50) badgeClass = 'score-bad';
            else if (p < 70) badgeClass = 'score-ok';
            else badgeClass = 'score-good';

            const attemptsIndicator = attempt.totalAttemptsInGroup > 1 ? `<i class="bi bi-chevron-right toggle-history-btn" data-simulado-key="${attempt.simulado}"></i> <small>(${attempt.totalAttemptsInGroup} tentativas)</small>` : '';

            const formattedDate = (typeof attempt.date === 'string' ? attempt.date.split(',')[0] : attempt.date) || '';

            const row = document.createElement('tr');
            row.className = 'history-summary-row';
            row.dataset.simuladoKey = attempt.simulado;

            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${attempt.simulado} ${attemptsIndicator}</td>
                <td>${attempt.correct} / ${attempt.total}</td>
                <td><span class="score-badge ${badgeClass}">${attempt.percentage}%</span></td>
                <td>
                    <button class="btn-review-icon" title="Revisar" data-attempt-id="${attempt.id}">
                        <i class="bi bi-search"></i>
                    </button>
                </td>
            `;
            historyTableBody.appendChild(row);
        });

        historyTableBody.querySelectorAll('.toggle-history-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const simuladoKey = e.target.dataset.simuladoKey;
                const parentRow = e.target.closest('tr');
                const isExpanded = e.target.classList.toggle('expanded');

                // Remove linhas detalhadas existentes para este simulado
                historyTableBody.querySelectorAll(`.detailed-attempt-row[data-parent="${simuladoKey}"]`).forEach(row => row.remove());

                if (isExpanded) {
                    const allAttempts = previousResults
                        .filter(r => r.simulado === simuladoKey)
                        .sort((a, b) => new Date(b.date) - new Date(a.date));

                    let nextSibling = parentRow.nextElementSibling;

                    allAttempts.forEach(detailAttempt => {
                        const detailRow = document.createElement('tr');
                        detailRow.className = 'detailed-attempt-row';
                        detailRow.dataset.parent = simuladoKey;

                        const p = parseFloat(detailAttempt.percentage);
                        let badgeClass;
                        if (p < 50) badgeClass = 'score-bad';
                        else if (p < 70) badgeClass = 'score-ok';
                        else badgeClass = 'score-good';

                        const formattedDate = (typeof detailAttempt.date === 'string' ? detailAttempt.date.split(',')[0] : detailAttempt.date) || '';

                        detailRow.innerHTML = `
                            <td>${formattedDate}</td>
                            <td></td>
                            <td>${detailAttempt.correct} / ${detailAttempt.total}</td>
                            <td><span class="score-badge ${badgeClass}">${detailAttempt.percentage}%</span></td>
                            <td>
                                <button class="btn-review-icon" title="Revisar" data-attempt-id="${detailAttempt.id}">
                                    <i class="bi bi-search"></i>
                                </button>
                            </td>
                        `;
                        historyTableBody.insertBefore(detailRow, nextSibling);
                    });
                }
            });
        });

        historyTableBody.querySelectorAll('.btn-review-icon').forEach(button => {
            button.addEventListener('click', (e) => {
                const attemptId = parseInt(e.currentTarget.dataset.attemptId);
                startGabaritoReview(attemptId);
            });
        });
    };

    const checkAchievements = (newResult) => {
        let unlocked = JSON.parse(localStorage.getItem(`achievements_${loggedInUser}`)) || {};
        if (previousResults.length >= 5) unlocked['persistent'] = true;
        if (newResult && parseFloat(newResult.percentage) >= 70) unlocked['approved'] = true;
        if (newResult && parseFloat(newResult.percentage) >= 100) unlocked['invincible'] = true;
        localStorage.setItem(`achievements_${loggedInUser}`, JSON.stringify(unlocked));
    };

    const renderSimuladoSelection = () => {
        simuladosListContainer.innerHTML = '';

        const icons = ['bi-1-circle-fill', 'bi-2-circle-fill', 'bi-3-circle-fill', 'bi-4-circle-fill', 'bi-5-circle-fill', 'bi-6-circle-fill', 'bi-7-circle-fill'];

        SIMULADO_FILES.forEach((simuladoKey, index) => {
            const attempts = previousResults.filter(r => r.simulado === simuladoKey);
            const bestAttempt = attempts.length > 0
                ? attempts.reduce((best, current) => parseFloat(current.percentage) > parseFloat(best.percentage) ? current : best)
                : null;

            const card = document.createElement('div');
            let cardStatus = 'status-new';
            let statsHTML = `<p>Você ainda não fez este simulado.</p>`;
            let buttonText = 'Iniciar';
            let buttonIcon = 'bi-play-fill';
            let buttonClass = 'btn-primary';

            if (bestAttempt) {
                const bestPercentage = parseFloat(bestAttempt.percentage);
                if (bestPercentage >= 70) {
                    cardStatus = 'status-approved';
                    statsHTML = `
                        <p>Melhor resultado: <strong>${bestPercentage.toFixed(2)}%</strong></p>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${bestPercentage}%;"></div>
                        </div>`;
                    buttonText = 'Refazer';
                    buttonIcon = 'bi-arrow-repeat';
                    buttonClass = 'btn-success';
                } else {
                    cardStatus = 'status-progress';
                    statsHTML = `
                        <p>Melhor resultado: <strong>${bestPercentage.toFixed(2)}%</strong></p>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${bestPercentage}%;"></div>
                        </div>`;
                    buttonText = 'Refazer';
                    buttonIcon = 'bi-arrow-repeat';
                    buttonClass = 'btn-warning';
                }
            }

            card.className = `simulado-card ${cardStatus}`;

            // Adiciona o botão de iniciar/refazer
            let cardContent = `
                <div class="simulado-card-header">
                    <div class="simulado-card-icon"><i class="bi ${icons[index]}"></i></div>
                    <h3>${simuladoKey ? simuladoKey.charAt(0).toUpperCase() + simuladoKey.slice(1).replace('o', 'o ') : 'Simulado Desconhecido'}</h3>
                </div>
                <div class="simulado-card-body">
                    ${statsHTML}
                </div>
                <div class="simulado-card-footer">
                    <button class="btn ${buttonClass}" data-simulado-key="${simuladoKey || 'unknown'}">
                        <i class="bi ${buttonIcon}"></i> ${buttonText}
                    </button>
            `;

            // Adiciona o link para o vídeo de correção se existir
            const correctionLink = SIMULADO_CORRECTION_LINKS[simuladoKey];
            if (correctionLink) {
                cardContent += `
                    <a href="#" class="correction-video-link" data-video-src="${correctionLink}" data-video-title="Correção ${simuladoKey.replace('simulado', 'Simulado ')}">
                        <i class="bi bi-play-circle-fill"></i> Assistir vídeo de correção
                    </a>
                `;
            }

            cardContent += `</div>`; // Fecha simulado-card-footer
            card.innerHTML = cardContent;
            simuladosListContainer.appendChild(card);
        });

        // Adiciona event listeners para os links de vídeo de correção
        simuladosListContainer.querySelectorAll('.correction-video-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const videoSrc = link.dataset.videoSrc;
                const videoTitle = link.dataset.videoTitle;
                showVideoPlayer(videoSrc, videoTitle); // Reutiliza a função showVideoPlayer
            });
        });
    };

    const renderAchievements = () => {
        const unlockedAchievements = JSON.parse(localStorage.getItem(`achievements_${loggedInUser}`)) || {};
        achievementsContainer.innerHTML = '';
        for (const key in ALL_ACHIEVEMENTS) {
            const ach = ALL_ACHIEVEMENTS[key];
            const isUnlocked = unlockedAchievements[key];

            const badge = document.createElement('div');
            badge.className = `achievement-badge ${isUnlocked ? 'unlocked' : ''}`;

            badge.innerHTML = `
                <i class="icon ${ach.icon}"></i>
                <span class="title">${ach.title}</span>
                <span class="tooltip">${ach.description}</span>
            `;
            achievementsContainer.appendChild(badge);
        }
    };

// VERSÃO FINAL DA FUNÇÃO RENDERSTUDYMATERIALS
const renderStudyMaterials = async () => {
    const moduleVisuals = [
        { icon: 'fa-rocket', color: '#e0f7fa' },
        { icon: 'fa-piggy-bank', color: '#e8f5e9' },
        { icon: 'fa-shield-halved', color: '#fff3e0' },
        { icon: 'fa-chart-line', color: '#fce4ec' },
        { icon: 'fa-triangle-exclamation', color: '#fffde7' },
        { icon: 'fa-user-secret', color: '#ede7f6' },
        { icon: 'fa-layer-group', color: '#e3f2fd' },
        { icon: 'fa-landmark', color: '#fbe9e7' },
        { icon: 'fa-brain', color: '#e0f2f1' },
        { icon: 'fa-book-open-reader', color: '#f9fbe7' },
        { icon: 'fa-vial-circle-check', color: '#f3e5f5' }
    ];

    modulesListContainer.innerHTML = '<p>Carregando materiais de estudo...</p>';

    try {
        const response = await fetch('/study-materials');
        const data = await response.json();
        modulesListContainer.innerHTML = '';

        if (data.success && data.modules && data.modules.length > 0) {
            data.modules.forEach((module, index) => {
                const moduleCard = document.createElement('div');
                moduleCard.className = 'study-module-card';
                const visual = moduleVisuals[index % moduleVisuals.length];

                // --- LÓGICA DE TÍTULO CORRETA ---
                let moduleNumberText = `Módulo ${module.id}`;
                let moduleTitleText = module.name;

                const nameParts = module.name.split('-');
                if (nameParts.length > 1 && !isNaN(parseInt(nameParts[0], 10))) {
                    moduleNumberText = `Módulo ${nameParts[0].trim()}`;
                    // Junta o resto, remove hifens, capitaliza a primeira letra
                    let rawTitle = nameParts.slice(1).join(' ').trim();
                    moduleTitleText = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
                }

                // --- LÓGICA DE PROGRESSO CORRETA (CONTA TODOS OS ARQUIVOS) ---
                const totalItems = module.files.length;
                let completedCount = 0;
                
                module.files.forEach(file => {
                    const itemId = `module_${module.id}_file_${file.name}`;
                    if (isItemCompleted(userId, itemId)) {
                        completedCount++;
                    }
                });
                const progressPercentage = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;
                // --- FIM DA LÓGICA DE PROGRESSO ---

                let filesListHTML = module.files.map(file => {
                    const isVideo = file.name.toLowerCase().endsWith('.mp4') || file.path.includes('drive.google.com');
                    const isPDF = file.name.toLowerCase().endsWith('.pdf');
                    const itemId = `module_${module.id}_file_${file.name}`;
                    const completed = isItemCompleted(userId, itemId);

                    let fileIcon = 'fa-solid fa-file icon-other';
                    let actionButton = '';
                    
                    if (isVideo) {
                        fileIcon = 'fa-solid fa-circle-play icon-video';
                        actionButton = `<button class="file-action-button btn-action-primary mark-as-completed-btn play-video-link" data-item-id="${itemId}" data-video-src="${file.path}" data-video-title="${moduleTitleText} - ${file.name}">${completed ? 'Revisar' : 'Assistir'}</button>`;
                    } else if (isPDF) {
                        fileIcon = 'fa-solid fa-file-pdf icon-pdf';
                        actionButton = `<button class="file-action-button btn-action-primary mark-as-completed-btn" data-item-id="${itemId}" data-pdf-src="${file.path}">${completed ? 'Revisar' : 'Abrir PDF'}</button>`;
                    }
                    
                    return `
                        <li class="study-file-item ${completed ? 'completed' : ''}">
                            <div class="file-info">
                                <i class="file-icon ${fileIcon}"></i>
                                <span>${file.name}</span>
                            </div>
                            ${actionButton}
                        </li>
                    `;
                }).join('');

                moduleCard.innerHTML = `
                    <div class="study-module-header">
                        <div class="study-module-header-top">
                            <div class="study-module-icon-wrapper" style="background-color: ${visual.color};">
                                <i class="fa-solid ${visual.icon}"></i>
                            </div>
                            <div class="study-module-title">
                                <span>${moduleNumberText}</span>
                                <h3>${moduleTitleText}</h3>
                            </div>
                            <i class="fa-solid fa-chevron-down study-module-arrow"></i>
                        </div>
                        <div class="study-progress-container">
                             <div class="study-progress-bar-bg">
                                <div class="study-progress-bar" style="width: ${progressPercentage}%;"></div>
                            </div>
                            <span class="study-progress-text">${Math.round(progressPercentage)}%</span>
                        </div>
                    </div>
                    <div class="study-module-content">
                        <ul class="study-files-list">${filesListHTML || '<p>Nenhum material neste módulo.</p>'}</ul>
                    </div>
                `;
                modulesListContainer.appendChild(moduleCard);
            });
        } else {
            modulesListContainer.innerHTML = '<p>Nenhum material de estudo encontrado.</p>';
        }

    } catch (error) {
        console.error("Erro ao carregar materiais de estudo:", error);
        modulesListContainer.innerHTML = '<p>Não foi possível carregar os materiais de estudo.</p>';
    }
};

// FUNÇÃO showVideoPlayer (VERSÃO FINAL COM PLAYLIST)
const showVideoPlayer = (module, currentFile) => {
    // 1. Guarda o contexto da playlist atual
    const allVideosInModule = module.files.filter(f => f.name.toLowerCase().endsWith('.mp4') || f.path.includes('drive.google.com'));
    currentVideoContext.moduleFiles = allVideosInModule;
    currentVideoContext.currentIndex = allVideosInModule.findIndex(f => f.name === currentFile.name);

    // 2. Define o título principal, o nome do módulo e o vídeo no player
    const moduleNameDisplayEl = document.getElementById('module-name-display');
    const videoTitleEl = document.getElementById('video-title');
    const videoIframe = document.getElementById('study-video-player');

    // Remove a extensão .mp4 do título do vídeo
    const videoFileNameWithoutExtension = currentFile.name.replace(/\.mp4$/i, '');

    moduleNameDisplayEl.textContent = module.name; // Exibe o nome do módulo
    videoTitleEl.textContent = videoFileNameWithoutExtension; // Exibe o nome do arquivo sem a extensão
    videoIframe.src = currentFile.path;

    // 3. Constrói a playlist na barra lateral
    const playlistContainer = document.getElementById('video-playlist-container');
    playlistContainer.innerHTML = ''; // Limpa a playlist antiga

    allVideosInModule.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'playlist-item';

        const itemId = `module_${module.id}_file_${file.name}`;
        const isCompleted = isItemCompleted(userId, itemId);

        if (isCompleted) li.classList.add('completed');
        if (index === currentVideoContext.currentIndex) li.classList.add('current');

        li.dataset.fileIndex = index; // Guarda o índice para navegação

        // Remove a extensão .mp4 da lista de reprodução também
        const playlistFileNameWithoutExtension = file.name.replace(/\.mp4$/i, '');

        li.innerHTML = `
            <i class="icon bi ${isCompleted ? 'bi-check-circle-fill' : 'bi-play-circle'}"></i>
            <span class="title">${playlistFileNameWithoutExtension}</span>
        `;
        playlistContainer.appendChild(li);
    });

    // 4. Atualiza os botões de navegação
    document.getElementById('prev-video-btn').disabled = (currentVideoContext.currentIndex <= 0);
    document.getElementById('next-video-btn').disabled = (currentVideoContext.currentIndex >= allVideosInModule.length - 1);

    // 5. Exibe a tela do player
    showScreen('video');
};


    // --- Event Listeners ---
    loginButton.addEventListener('click', handleLogin); registerButton.addEventListener('click', handleRegister); logoutButton.addEventListener('click', handleLogout);
    studyButton.addEventListener('click', () => showScreen('study')); // NOVO: Event listener para o botão Estudos
    simuladosListContainer.addEventListener('click', (e) => { const btn = e.target.closest('button[data-simulado-key]'); if (btn) startSimulado(btn.dataset.simuladoKey); }); // Atualizado para pegar o botão de iniciar/refazer
    currentQuestionContainer.addEventListener('change', (e) => { if (e.target.type === 'radio') { const qId = e.target.name.split('_')[1]; userAnswers[qId] = e.target.value; renderCurrentQuestion(); renderQuestionNavigator(); } });
    prevBtn.addEventListener('click', () => { if (currentQuestionIndex > 0) { currentQuestionIndex--; renderQuestionInterface(); } });
    nextBtn.addEventListener('click', () => { if (currentQuestionIndex < currentSimulado.questions.length - 1) { currentQuestionIndex++; renderQuestionInterface(); } });
    questionNavigator.addEventListener('click', (e) => { if (e.target.matches('.nav-question-btn')) { currentQuestionIndex = parseInt(e.target.dataset.index); renderQuestionInterface(); } });
    finishBtn.addEventListener('click', handleFinishAttempt); sidebarFinishBtn.addEventListener('click', handleFinishAttempt);
    backToSelectionButton.addEventListener('click', () => showScreen('selection'));

    reviewErrorsButton.addEventListener('click', () => {
        if (previousResults.length > 0) {
            const lastAttemptWithErrors = previousResults.slice().reverse().find(r => r.total - r.correct > 0);
            if (lastAttemptWithErrors) {
                startGabaritoReview(lastAttemptWithErrors.id);
            } else {
                alert("Não há tentativas com erros para revisar.");
            }
        }
        else {
            alert("Você ainda não fez nenhum simulado.");
        }
    });

    startRedoErrorsBtn.addEventListener('click', startRedoErrorsMode);
    backToDashboardBtn.addEventListener('click', () => showScreen('results'));

    avatarUploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('userId', userId);

        try {
            const response = await fetch('/upload/avatar', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                userAvatarImg.src = data.path;
                localStorage.setItem('cpa20UserAvatar', data.path);
            } else {
                console.error("Erro no upload do avatar:", data.message);
            }
        } catch (error) {
            console.error("Erro no upload do avatar:", error);
        }
    });

    const currentTheme = localStorage.getItem('theme');

    if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        let theme = 'light';
        if (document.body.classList.contains('dark-theme')) {
            theme = 'dark';
        }
        localStorage.setItem('theme', theme);
    });

    const init = async () => {
        loggedInUser = localStorage.getItem('cpa20LoggedInUser');
        userId = localStorage.getItem('cpa20UserId');

        const currentTheme = localStorage.getItem('theme');
        if (currentTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }

        if (loggedInUser && userId) {
            welcomeMessage.textContent = `Olá, ${loggedInUser}!`;
            const savedAvatar = localStorage.getItem('cpa20UserAvatar');
            userAvatarImg.src = (savedAvatar && savedAvatar !== 'null' && savedAvatar !== 'undefined') ? savedAvatar : DEFAULT_AVATAR;
            await loadAttemptsFromServer();
            (previousResults.length > 0) ? (renderDashboard(), showScreen('results')) : showScreen('selection');
        } else {
            showScreen('login');
        }
    };
    init();

    // Event listener FINAL para Módulos de Estudo
    modulesListContainer.addEventListener('click', (e) => {
        // Lógica para abrir/fechar o acordeão
        const header = e.target.closest('.study-module-header');
        if (header) {
            const content = header.parentElement.querySelector('.study-module-content');
            header.classList.toggle('active');
            content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
        }

        // Lógica para marcar item como concluído e abrir (VÍDEO ou PDF)
        const actionButton = e.target.closest('.mark-as-completed-btn');
        if (actionButton) {
            e.preventDefault();
            const itemId = actionButton.dataset.itemId;

            // Marca o item como concluído, não importa o tipo

// ADICIONE ESTES NOVOS LISTENERS NO FINAL DO SEU SCRIPT

// Listener para a playlist de vídeos
document.getElementById('video-playlist-container').addEventListener('click', (e) => {
    const item = e.target.closest('.playlist-item');
    if (item) {
        const newIndex = parseInt(item.dataset.fileIndex, 10);
        const moduleData = currentVideoContext.moduleFiles[newIndex];

        // Re-busca o módulo pai para passar o objeto completo
         fetch('/study-materials').then(res => res.json()).then(data => {
            const parentModule = data.modules.find(m => m.files.some(f => f.name === moduleData.name));
            const fileData = parentModule.files.find(f => f.name === moduleData.name);

            markItemAsCompleted(userId, `module_${parentModule.id}_file_${fileData.name}`);
            showVideoPlayer(parentModule, fileData);
        });
    }
});

// Listener para o botão "Próxima Aula"
document.getElementById('next-video-btn').addEventListener('click', () => {
    const newIndex = currentVideoContext.currentIndex + 1;
    if (newIndex < currentVideoContext.moduleFiles.length) {
        const nextFile = currentVideoContext.moduleFiles[newIndex];
         fetch('/study-materials').then(res => res.json()).then(data => {
            const parentModule = data.modules.find(m => m.files.some(f => f.name === nextFile.name));
            markItemAsCompleted(userId, `module_${parentModule.id}_file_${nextFile.name}`);
            showVideoPlayer(parentModule, nextFile);
        });
    }
});

// Listener para o botão "Aula Anterior"
document.getElementById('prev-video-btn').addEventListener('click', () => {
    const newIndex = currentVideoContext.currentIndex - 1;
    if (newIndex >= 0) {
        const prevFile = currentVideoContext.moduleFiles[newIndex];
         fetch('/study-materials').then(res => res.json()).then(data => {
            const parentModule = data.modules.find(m => m.files.some(f => f.name === prevFile.name));
            markItemAsCompleted(userId, `module_${parentModule.id}_file_${prevFile.name}`);
            showVideoPlayer(parentModule, prevFile);
        });
    }
});

            markItemAsCompleted(userId, itemId);

            // Decide o que fazer: abrir vídeo ou PDF
            const videoSrc = actionButton.dataset.videoSrc;
            const pdfSrc = actionButton.dataset.pdfSrc;

            if (videoSrc) {
                // Encontra o módulo e o arquivo correspondentes para passar para a função
                // Esta é uma busca simplificada. Você pode precisar ajustar dependendo de como seus dados estão estruturados.
                // A melhor forma é ter os dados dos módulos já disponíveis em uma variável.
                fetch('/study-materials').then(res => res.json()).then(data => {
                    const parentModule = data.modules.find(m => m.files.some(f => f.path === videoSrc));
                    const fileData = parentModule.files.find(f => f.path === videoSrc);
                    showVideoPlayer(parentModule, fileData);
                });
            } else if (pdfSrc) {
                window.open(pdfSrc, '_blank');
                // Re-renderiza a lista imediatamente para PDFs, pois não há tela de transição
                renderStudyMaterials();
            }
        }
    });

    // Event listener para o botão de voltar na seção do player de vídeo (ATUALIZADO)
    backToStudyModulesButton.addEventListener('click', () => {
        const videoIframe = document.getElementById('study-video-player');
        if (videoIframe) {
            videoIframe.src = ''; // Limpa o src para parar o vídeo
        }

        // Se o título indicar que é uma correção, volta para os simulados
        if (videoTitle.textContent.startsWith('Correção Simulado')) {
            showScreen('selection');
        } else {
            // Se for um vídeo de estudo, volta para a tela de estudos E ATUALIZA A LISTA
            showScreen('study'); // A função showScreen já chama renderStudyMaterials()
        }
    });

});