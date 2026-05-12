import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

// FASE 5: Cache local habilitada por defecto en transformers.js (Usa IndexedDB)
env.allowLocalModels = false; // Usamos Hugging Face Hub

let extractor = null;
let generator = null;

// FASE 5: Cálculo de Similitud de Coseno
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

self.onmessage = async (event) => {
    const { action, payload, id } = event.data;

    try {
        if (action === 'init') {
            // Cargar Modelo de Embeddings (all-MiniLM-L6-v2)
            extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                progress_callback: x => self.postMessage({ type: 'progress', data: x })
            });
            // Cargar Modelo pequeño de generación de texto (Flan-T5-small) - FASE 7
            generator = await pipeline('text2text-generation', 'Xenova/flan-t5-small', {
                progress_callback: x => self.postMessage({ type: 'progress', data: x })
            });
            self.postMessage({ type: 'ready' });
        } 
        else if (action === 'analyze_semantics') {
            const { keywords, cvParagraphs } = payload;
            
            // Vectorizar todos los párrafos del CV
            const cvEmbeddings = [];
            for (const p of cvParagraphs) {
                if (p.trim().length === 0) continue;
                const output = await extractor(p, { pooling: 'mean', normalize: true });
                cvEmbeddings.push({ text: p, vector: output.data });
            }

            const results = {};
            for (const kw of keywords) {
                const kwOutput = await extractor(kw.replace(/_/g, ' '), { pooling: 'mean', normalize: true });
                const kwVector = kwOutput.data;
                
                let bestScore = -1;
                let bestMatch = null;
                
                // Comparar distancia vectorial
                for (const cv of cvEmbeddings) {
                    const score = cosineSimilarity(kwVector, cv.vector);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = cv.text;
                    }
                }
                
                // Threshold semántico: 0.45 en all-MiniLM es una coincidencia razonable
                results[kw] = { score: bestScore, bestParagraph: bestMatch, isSemanticMatch: bestScore > 0.45 };
            }
            
            // FASE 8: Liberación de memoria explícita de estructuras temporales pesadas
            cvEmbeddings.length = 0;
            
            self.postMessage({ type: 'semantics_result', id, results });
        }
        else if (action === 'generate_suggestion') {
            const { keyword } = payload;
            const kwClean = keyword.replace(/_/g, ' ');
            const prompt = `Write a short professional resume bullet point containing the skill: ${kwClean}`;
            const output = await generator(prompt, { max_new_tokens: 30 });
            self.postMessage({ type: 'suggestion_result', id, keyword, text: output[0].generated_text });
        }
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message });
    }
};
