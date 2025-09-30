const SCRIPT_URL = "/.netlify/functions/submit-annotation";
const EVALUATIONS_CSV_PATH = "https://raw.githubusercontent.com/laysearaujo/cross-lingual-prompt-analysis/main/data/judged/sample_master_annotator_pool.csv";
const QUESTIONS_CSV_PATH = "https://raw.githubusercontent.com/laysearaujo/cross-lingual-prompt-analysis/main/data/raw/prompts.csv";
const BATCH_SIZE = 10;
const PROMPT_TYPES = ['minimum', 'contextual', 'detailed', 'structured'];

let combinedData = [], availableSamples = [], currentBatch = [], currentBatchIndex = 0, humanId = "";
let annotatedIds = new Set();
let completedQuestions = [];

window.addEventListener('DOMContentLoaded', async () => {
    generateHumanId();
    await loadCompletedQuestions();
    await loadData();
});

function generateHumanId() {
    humanId = localStorage.getItem('humanId');
    if (!humanId) {
        humanId = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('humanId', humanId);
    }

    const annotated = localStorage.getItem('annotatedIds');
    if (annotated) annotatedIds = new Set(JSON.parse(annotated));
}

async function loadCompletedQuestions() {
    try {
        const res = await fetch(SCRIPT_URL);
        completedQuestions = await res.json();
        console.log(`${completedQuestions.length} completed questions loaded.`);
    } catch (error) {
        console.error("Failed to load completed questions:", error);
        completedQuestions = [];
    }
}

function showScreen(screenId) {
    ['instructions-container', 'setup-container', 'annotation-container', 'batch-complete-container', 'all-done-container'].forEach(cId => document.getElementById(cId).classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

function showSetupScreen() { showScreen('setup-container'); }

function endSession() {
    const container = document.getElementById('batch-complete-container');
    container.innerHTML = '<h2>Obrigado!</h2><p>Sua contribuição foi registrada. Pode fechar esta aba.</p>';
    showScreen('batch-complete-container');
}

async function loadData() {
    try {
        const [evaluations, questions] = await Promise.all([
            parseCsv(EVALUATIONS_CSV_PATH),
            parseCsv(QUESTIONS_CSV_PATH)
        ]);

        const questionsMap = new Map(questions.map(q => [q.question_id, q]));

        combinedData = evaluations.map(ev => {
            const questionRow = questionsMap.get(ev.question_id);
            if (!questionRow) return null;

            let languageValue = ev.language;
            if (!languageValue || languageValue.trim() === '') languageValue = 'en';

            const idParts = ev.evaluation_id.toLowerCase().split('_');
            let promptType = idParts.find(part => PROMPT_TYPES.includes(part));
            if (!promptType) return null;

            let normalizedLanguage = languageValue.split('-')[0].toLowerCase();
            const columnName = `prompt_${promptType}_${normalizedLanguage}`;
            const promptText = questionRow[columnName];
            if (!promptText) {
                console.warn(`Column "${columnName}" not found for question_id: ${ev.question_id}`);
                return null;
            }

            return {
                id: ev.evaluation_id,
                baseId: ev.evaluation_id.split('_')[0],
                prompt: promptText,
                response_A: ev.response_A,
                response_B: ev.response_B,
                domain: ev.domain,
                language: languageValue,
                human_count: parseInt(ev.human_count || "0", 10)
            };
        }).filter(item => item && item.human_count < 3);

        console.log(`Load complete. Total valid samples: ${combinedData.length}`);

        populateFilters();
        document.getElementById('loading-status').style.display = 'none';
        document.getElementById('start-btn').disabled = false;
        document.getElementById('start-btn').innerText = "Iniciar Anotação";
    } catch (error) {
        console.error("Failed to load CSV files:", error);
        const status = document.getElementById('loading-status');
        status.style.color = 'red';
        status.innerText = "Erro ao carregar dados. Verifique os links dos CSVs e o console (F12).";
    }
}

function parseCsv(filePath) { return new Promise((resolve, reject) => { Papa.parse(filePath, { download: true, header: true, skipEmptyLines: true, complete: results => resolve(results.data), error: err => reject(err) }); }); }

function populateFilters() {
    const domainMap = { "General Knowledge": "Conhecimento Geral", "Technical": "Técnico (Programação)", "Creative": "Criatividade" };
    const domains = [...new Set(
        combinedData
            .filter(item => !completedQuestions.includes(item.id))
            .map(item => item.domain)
    )].sort();

    const domainContainer = document.getElementById('domain-multiselect-container');
    domainContainer.innerHTML = '';
    domains.forEach(domain => {
        if (domain) {
            const optionEl = document.createElement('div');
            optionEl.classList.add('multiselect-option');
            optionEl.dataset.value = domain;
            optionEl.innerText = domainMap[domain] || domain;
            optionEl.addEventListener('click', () => optionEl.classList.toggle('selected'));
            domainContainer.appendChild(optionEl);
        }
    });
    const languageSelect = document.getElementById('language-select');
    languageSelect.innerHTML = '';
    languageSelect.add(new Option("Português", "pt-br"));
    languageSelect.add(new Option("Inglês", "en"));
    languageSelect.add(new Option("Ambos", "todos"));
    languageSelect.value = "pt-br";
}

async function startAnnotationSession() {
    await loadCompletedQuestions(); 

    const selectedDomains = Array.from(
        document.querySelectorAll('#domain-multiselect-container .multiselect-option.selected')
    ).map(el => el.dataset.value.toLowerCase());

    const selectedLanguage = document.getElementById('language-select').value;

    const filteredSamples = combinedData.filter(item => {
        const matchDomain = selectedDomains.length === 0 || selectedDomains.includes((item.domain || '').toLowerCase());
        let matchLanguage = false;
        if (selectedLanguage === 'todos') {
            matchLanguage = true;
        } else {
            const itemLang = item.language || '';
            matchLanguage = itemLang.toLowerCase().startsWith(selectedLanguage.toLowerCase().split('-')[0]);
        }

        const notCompleted = !completedQuestions.includes(item.id);
        const notAnnotated = !annotatedIds.has(item.id)

        return matchDomain && matchLanguage && notCompleted && notAnnotated;
    });

    availableSamples = filteredSamples;
    console.log(`${availableSamples.length} samples available for this user.`);
    prepareNewBatch();
}

function prepareNewBatch() {
    if (availableSamples.length === 0) {
        showScreen('all-done-container');
        return;
    }

    for (let i = availableSamples.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableSamples[i], availableSamples[j]] = [availableSamples[j], availableSamples[i]];
    }

    const seenBaseIds = new Set();
    currentBatch = [];
    for (const sample of availableSamples) {
        if (!seenBaseIds.has(sample.baseId)) {
            currentBatch.push(sample);
            seenBaseIds.add(sample.baseId);
        }
        if (currentBatch.length >= BATCH_SIZE) break;
    }

    currentBatchIndex = 0;
    showScreen('annotation-container');
    loadNextSample();
}

function loadNextSample() {
    window.scrollTo(0, 0);
    if (currentBatchIndex >= currentBatch.length) {
        document.getElementById('stats-gerais').innerText = `Você já anotou um total de ${annotatedIds.size} amostras.`;
        showScreen('batch-complete-container');
        return;
    }
    const item = currentBatch[currentBatchIndex];
    document.getElementById('prompt').innerText = "Prompt: " + item.prompt;
    document.getElementById('response-a').innerText = item.response_A;
    document.getElementById('response-b').innerText = item.response_B;
    document.getElementById('progress').innerText = `Amostra ${currentBatchIndex + 1} de ${currentBatch.length} (neste lote)`;
}

function saveAnnotation(choice) {
    const currentItem = currentBatch[currentBatchIndex];
    console.log('id_question', currentItem.id)
    const dataToSave = { evaluation_id: currentItem.id, human_choice: choice, human_id: humanId };
    fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSave) })
        .catch(error => console.error("Error saving:", error));
    annotatedIds.add(currentItem.id);
    localStorage.setItem('annotatedIds', JSON.stringify(Array.from(annotatedIds)));
    availableSamples = availableSamples.filter(item => item.id !== currentItem.id);
    currentBatchIndex++;
    loadNextSample();
}