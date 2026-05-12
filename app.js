const stopWords = new Set([
    "a", "ante", "bajo", "cabe", "con", "contra", "de", "desde", "durante", "en", "entre", "hacia", "hasta", "mediante", "para", "por", "según", "segun", "sin", "so", "sobre", "tras", "versus", "vía", "via",
    "el", "la", "los", "las", "un", "una", "unos", "unas", "al", "del", "lo", "y", "e", "o", "u", "ni", "que", "como", "mas", "pero", "sino", "porque", "aunque", "si",
    "su", "sus", "tu", "tus", "mi", "mis", "nuestro", "nuestra", "vuestro", "vuestra", "se", "me", "nos", "os", "te",
    "es", "son", "ser", "estar", "fue", "ha", "han", "he", "has", "hemos", "habéis", "han", "soy", "eres", "somos", "sois", "fui", "fuiste", "fuimos", "fueron", "estoy", "estás", "estamos", "estáis", "están",
    "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas", "aquel", "aquella", "aquellos", "aquellas",
    "muy", "mucho", "poco", "todo", "toda", "todos", "todas", "nada", "algo", "quien", "quienes", "cual", "cuales", "cuando", "donde", "mientras",
    "tambien", "también", "ademas", "además", "incluso", "entonces", "luego", "asi", "así", "pues", "ya",
    "no", "si", "sí", "solo", "solamente", "años", "experiencia", "conocimientos", "valorable", "imprescindible", "requiere", "requisitos", "oferta", "puesto", "empresa", "trabajo", "equipo", "persona", "perfil", "buscamos", "importante", "sector", "cliente", "clientes", "proyecto", "proyectos", "funciones", "tareas", "candidato", "candidata", "profesional", "jornada", "completa", "parcial", "contrato", "indefinido", "temporal", "salario", "remuneración", "beneficios", "desarrollo", "carrera", "incorporación", "inmediata", "ubicación", "lugar", "horario", "lunes", "viernes", "fin", "semana", "meses", "mes", "año", "nivel", "alto", "medio", "bajo", "mínimo", "minimo", "máximo", "maximo", "valora", "imprescindibles",
    "competitivo", "ganas", "aprender", "excelente", "ambiente", "crecimiento", "oportunidad", "unete", "únete", "estabilidad", "laboral"
]);

const knownConcepts = [
    "machine learning", "recursos humanos", "sql server", "amazon web services",
    "google cloud platform", "inteligencia artificial", "user experience", "user interface",
    "front end", "back end", "full stack", "data science", "data engineer", "deep learning",
    "react js", "node js", "vue js", "angular js", "power bi", "agile methodologies", "scrum master",
    "ci cd", "continuous integration"
];

let techSynonyms = {};
let aiReady = false;
let currentAnalysis = { found: [], missing: [], score: 0 };

fetch('tech-synonyms.json')
    .then(res => res.json())
    .then(data => { techSynonyms = data; })
    .catch(err => console.error("Error loading synonyms", err));

const darkModeBtn = document.getElementById('darkModeBtn');
const htmlEl = document.documentElement;
const jobDescriptionInput = document.getElementById('jobDescription');
const cvUploadInput = document.getElementById('cvUpload');
const fileNameDisplay = document.getElementById('fileName');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsSection = document.getElementById('resultsSection');
const emptyState = document.getElementById('emptyState');
const loadingSpinner = document.getElementById('loadingSpinner');
const modelLoadingInfo = document.getElementById('modelLoadingInfo');
const atsWarningBox = document.getElementById('atsWarningBox');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const scoreCircle = document.getElementById('scoreCircle');
const scoreText = document.getElementById('scoreText');
const foundKeywordsDiv = document.getElementById('foundKeywords');
const missingKeywordsDiv = document.getElementById('missingKeywords');

let cvFile = null;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf-worker.js';

const aiWorker = new Worker('ai-worker.js', { type: 'module' });

aiWorker.onmessage = (e) => {
    const data = e.data;
    if (data.type === 'progress') {
        if (data.data && data.data.status === 'progress') {
            document.getElementById('progressContainer').classList.remove('hidden');
            const pct = Math.round(data.data.progress || 0);
            document.getElementById('loadingStatusText').textContent = `Descargando Modelos: ${data.data.file || ''} (${pct}%)`;
            document.getElementById('progressBar').style.width = `${pct}%`;
        }
    } else if (data.type === 'ready') {
        aiReady = true;
        modelLoadingInfo.classList.replace('bg-indigo-600', 'bg-green-600');
        document.getElementById('loadingSpinnerAI').classList.add('hidden');
        document.getElementById('loadingStatusText').textContent = '🧠 Modelos IA Semánticos Listos';
        document.getElementById('loadingSubText').textContent = 'Todo preparado para analizar tu CV en local.';
        document.getElementById('progressContainer').classList.add('hidden');
        setTimeout(() => {
            modelLoadingInfo.style.opacity = '0';
            setTimeout(() => modelLoadingInfo.classList.add('hidden'), 500);
        }, 3500);
        analyzeBtn.disabled = false;
    }
};

aiWorker.postMessage({ action: 'init' });

darkModeBtn.addEventListener('click', () => {
    htmlEl.classList.toggle('dark');
});

cvUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        cvFile = file;
        fileNameDisplay.textContent = `📄 ${file.name}`;
        fileNameDisplay.classList.remove('hidden');
    } else {
        cvFile = null;
        fileNameDisplay.classList.add('hidden');
    }
});

async function extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function (event) {
            try {
                const typedarray = new Uint8Array(event.target.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = '';
                let blocks = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();

                    let currentBlock = "";
                    let lastY = -1;

                    textContent.items.forEach(item => {
                        if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 15) {
                            blocks.push(currentBlock.trim());
                            currentBlock = "";
                        }
                        currentBlock += item.str + " ";
                        lastY = item.transform[5];
                    });
                    if (currentBlock.trim()) blocks.push(currentBlock.trim());

                    fullText += textContent.items.map(item => item.str).join(' ') + '\n';
                }

                let isDense = false;
                blocks.forEach(b => {
                    if (b.split(/\s+/).length > 100) isDense = true;
                });

                resolve({ fullText, paragraphs: blocks.filter(b => b.length > 20), isDense });
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

function normalizeWithSynonyms(text) {
    let lower = text.toLowerCase();
    for (const [key, val] of Object.entries(techSynonyms)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        lower = lower.replace(regex, val);
    }
    knownConcepts.forEach(concept => {
        const regex = new RegExp(`\\b${concept}\\b`, 'g');
        lower = lower.replace(regex, concept.replace(/ /g, '_'));
    });
    return lower;
}

function tokenizeText(text) {
    const normalizedText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const cleanText = normalizedText.replace(/[^\w\s_]/g, ' '); // Permite _ para bigramas
    return cleanText.split(/\s+/).filter(word => word.length > 0);
}

function getTopKeywords(text) {
    const normText = normalizeWithSynonyms(text);
    const words = tokenizeText(normText);
    const wordCounts = {};

    words.forEach(word => {
        const checkWord = word.replace(/_/g, ' ');
        if (word.length >= 3 && !stopWords.has(checkWord)) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
    });

    return Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(entry => entry[0]);
}

analyzeBtn.addEventListener('click', async () => {
    const jobDescription = jobDescriptionInput.value.trim();

    if (!jobDescription || !cvFile) {
        alert('Falta rellenar la oferta o subir el CV.');
        return;
    }
    if (!aiReady) {
        alert('Por favor espera a que los modelos de IA terminen de cargar.');
        return;
    }

    analyzeBtn.disabled = true;
    loadingSpinner.classList.remove('hidden');
    resultsSection.classList.add('hidden', 'opacity-0');
    emptyState.classList.add('hidden');
    atsWarningBox.classList.add('hidden');

    try {
        const { fullText, paragraphs, isDense } = await extractTextFromPDF(cvFile);

        if (isDense) atsWarningBox.classList.remove('hidden');

        const topKeywords = getTopKeywords(jobDescription);

        const cvWords = tokenizeText(normalizeWithSynonyms(fullText));
        const uniqueCvWords = Array.from(new Set(cvWords)).map(word => ({ word }));
        const fuse = new Fuse(uniqueCvWords, { keys: ['word'], threshold: 0.2 });

        const foundTokens = [];
        const missingTokens = [];

        topKeywords.forEach(kw => {
            if (fuse.search(kw).length > 0) {
                foundTokens.push({ keyword: kw, method: 'Match Directo', context: 'Coincidencia literal detectada' });
            } else {
                missingTokens.push(kw);
            }
        });

        if (missingTokens.length > 0) {
            const id = Date.now();
            const aiPromise = new Promise((resolve) => {
                const handler = (e) => {
                    if (e.data.type === 'semantics_result' && e.data.id === id) {
                        aiWorker.removeEventListener('message', handler);
                        resolve(e.data.results);
                    }
                };
                aiWorker.addEventListener('message', handler);
            });

            aiWorker.postMessage({
                action: 'analyze_semantics',
                payload: { keywords: missingTokens, cvParagraphs: paragraphs },
                id
            });

            const semanticResults = await aiPromise;

            const finalMissing = [];
            for (const kw of missingTokens) {
                const res = semanticResults[kw];
                if (res && res.isSemanticMatch) {
                    foundTokens.push({
                        keyword: kw,
                        method: `Match Semántico IA (${Math.round(res.score * 100)}%)`,
                        context: `Detectado concepto similar en: "${res.bestParagraph.substring(0, 80)}..."`
                    });
                } else {
                    finalMissing.push(kw);
                }
            }

            currentAnalysis.found = foundTokens;
            currentAnalysis.missing = finalMissing;

            updateUI(foundTokens, finalMissing, topKeywords.length);

            finalMissing.forEach(kw => {
                const reqId = Date.now() + Math.random();
                const sugHandler = (e) => {
                    if (e.data.type === 'suggestion_result' && e.data.id === reqId) {
                        aiWorker.removeEventListener('message', sugHandler);
                        injectSuggestionTooltip(kw, e.data.text);
                    }
                };
                aiWorker.addEventListener('message', sugHandler);
                aiWorker.postMessage({ action: 'generate_suggestion', payload: { keyword: kw }, id: reqId });
            });

        } else {
            currentAnalysis.found = foundTokens;
            currentAnalysis.missing = [];
            updateUI(foundTokens, [], topKeywords.length);
        }

    } catch (error) {
        console.error("Error", error);
        alert('Error en el análisis local.');
        emptyState.classList.remove('hidden');
    } finally {
        analyzeBtn.disabled = false;
        loadingSpinner.classList.add('hidden');
    }
});

function updateUI(found, missing, total) {
    foundKeywordsDiv.innerHTML = '';
    missingKeywordsDiv.innerHTML = '';

    found.forEach(item => {
        const span = document.createElement('span');
        span.className = 'keyword-badge keyword-found group relative';
        span.innerHTML = `
            ${item.keyword.replace(/_/g, ' ')}
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-10 tooltip-content">
                <p class="font-bold mb-1 text-green-400">${item.method}</p>
                <p class="text-gray-300">${item.context}</p>
                <div class="absolute w-3 h-3 bg-gray-900 transform rotate-45 -bottom-1.5 left-1/2 -translate-x-1/2"></div>
            </div>
        `;
        foundKeywordsDiv.appendChild(span);
    });

    missing.forEach(kw => {
        const span = document.createElement('span');
        span.className = 'keyword-badge keyword-missing group relative';
        span.id = `badge-${kw}`;
        span.innerHTML = `
            ${kw.replace(/_/g, ' ')}
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-10 tooltip-content">
                <p class="font-bold mb-1 text-red-400">Generando sugerencia IA...</p>
                <div class="animate-pulse flex space-x-2 mt-2"><div class="h-2 bg-gray-600 rounded w-full"></div></div>
                <div class="absolute w-3 h-3 bg-gray-900 transform rotate-45 -bottom-1.5 left-1/2 -translate-x-1/2"></div>
            </div>
        `;
        missingKeywordsDiv.appendChild(span);
    });

    const percentage = Math.round((found.length / total) * 100);
    currentAnalysis.score = percentage;
    scoreText.textContent = `${percentage}%`;
    const dashArray = `${percentage}, 100`;

    scoreCircle.classList.remove('text-red-500', 'text-yellow-500', 'text-green-500');
    if (percentage < 40) scoreCircle.classList.add('text-red-500');
    else if (percentage < 70) scoreCircle.classList.add('text-yellow-500');
    else scoreCircle.classList.add('text-green-500');

    resultsSection.classList.remove('hidden');
    void resultsSection.offsetWidth;
    resultsSection.classList.remove('opacity-0');

    setTimeout(() => { scoreCircle.setAttribute('stroke-dasharray', dashArray); }, 50);
}

function injectSuggestionTooltip(keyword, suggestionText) {
    const badge = document.getElementById(`badge-${keyword}`);
    if (badge) {
        const tooltip = badge.querySelector('.tooltip-content');
        tooltip.innerHTML = `
            <p class="font-bold mb-1 text-blue-400">💡 Sugerencia IA:</p>
            <p class="text-gray-200 italic">"${suggestionText}"</p>
            <div class="absolute w-3 h-3 bg-gray-900 transform rotate-45 -bottom-1.5 left-1/2 -translate-x-1/2"></div>
        `;
    }
}

exportPdfBtn.addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Reporte de Optimizacion CV (AI)", 20, 20);

    doc.setFontSize(14);
    doc.text(`Match Score: ${currentAnalysis.score}%`, 20, 30);

    doc.setFontSize(12);
    doc.setTextColor(0, 128, 0);
    doc.text("Keywords Validadas:", 20, 45);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    let y = 55;
    currentAnalysis.found.forEach(item => {
        doc.text(`- ${item.keyword.replace(/_/g, ' ')} (${item.method.split(' ')[0]})`, 25, y);
        y += 7;
    });

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 0, 0);
    doc.text("Keywords Ausentes (Oportunidades):", 20, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    y += 10;
    currentAnalysis.missing.forEach(kw => {
        doc.text(`- ${kw.replace(/_/g, ' ')}`, 25, y);
        y += 7;
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
    });

    doc.save("Reporte_Optimizacion_CV.pdf");
});
