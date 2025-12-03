/**
 * CopiumMeter - Progressive Web App with Offline Inference
 * Uses Transformers.js for on-device ML when offline
 * Falls back to HuggingFace Spaces API when online
 */

// Configuration
const API_BASE = "https://kurtesianplane-copium-meter.hf.space";
const MODEL_ID = "kurtesianplane/copium-meter";

const ONNX_MODEL_AVAILABLE = true;

// Transformers.js pipeline
let classifier = null;

// Label definitions
const labels = {
    copium: { 
        name: 'Copium', 
        emoji: '💀', 
        color: '#ec4899',
        description: 'Denial, coping, rationalization'
    },
    sarcastic: { 
        name: 'Sarcastic', 
        emoji: '🙃', 
        color: '#f59e0b',
        description: 'Irony, mockery, exaggeration'
    },
    sincere: { 
        name: 'Sincere', 
        emoji: '😌', 
        color: '#10b981',
        description: 'Genuine, honest, appreciative'
    },
    neutral: { 
        name: 'Neutral', 
        emoji: '😐', 
        color: '#6b7280',
        description: 'Factual, objective, informational'
    }
};

const labelsByIndex = {
    0: 'copium',
    1: 'sarcastic', 
    2: 'sincere',
    3: 'neutral'
};

// State
let isOnline = navigator.onLine;
let isModelLoaded = false;
let isModelLoading = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Set up event listeners
    document.getElementById('inputText').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            analyzeText();
        }
    });
    
    // Monitor online/offline status
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);
    
    // Initialize
    await initialize();
});

async function initialize() {
    updateStatus('🔄 Initializing...', 'loading');
    
    // Start loading model in background
    loadModelInBackground();
    
    // Check online status
    if (isOnline) {
        await checkApiStatus();
    } else {
        updateStatus('📴 Offline - Loading local model...', 'warning');
    }
}

function handleOnlineStatusChange() {
    isOnline = navigator.onLine;
    
    if (isOnline) {
        if (isModelLoaded) {
            updateStatus('🟢 Online - Local model ready', 'success');
        } else {
            updateStatus('🟢 Online - Using Cloud API', 'success');
        }
    } else {
        if (isModelLoaded) {
            updateStatus('📴 Offline - Using local model', 'warning');
        } else if (isModelLoading) {
            updateStatus('📴 Offline - Loading model...', 'loading');
        } else {
            updateStatus('❌ Offline - No model cached', 'error');
        }
    }
}

async function checkApiStatus() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(API_URL.replace('/api/predict', '/'), {
            method: 'GET',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
            if (isModelLoaded) {
                updateStatus('🟢 Online - Local model ready', 'success');
            } else {
                updateStatus('🟢 Online - Using Cloud API', 'success');
            }
        } else {
            throw new Error('API not ready');
        }
    } catch (e) {
        if (isModelLoaded) {
            updateStatus('🟡 API unavailable - Using local model', 'warning');
        } else {
            updateStatus('🟡 Loading local model...', 'loading');
        }
    }
}

async function loadModelInBackground() {
    if (isModelLoading || isModelLoaded) return;
    
    // Skip if ONNX model not yet available
    if (!ONNX_MODEL_AVAILABLE) {
        console.log('⚠️ ONNX model not yet exported. Using API only.');
        console.log('Run tools/export_to_onnx.py and upload to HuggingFace to enable offline mode.');
        return;
    }
    
    isModelLoading = true;
    
    try {
        // Wait for Transformers.js to be available
        let attempts = 0;
        while (!window.Transformers && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        if (!window.Transformers) {
            throw new Error('Transformers.js not loaded');
        }
        
        const { pipeline, env } = window.Transformers;
        
        // Configure for browser
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        
        console.log('Loading model from HuggingFace...');
        updateStatus('📥 Downloading model...', 'loading');
        
        // Load the classifier with progress tracking
        // Using dtype: 'fp32' to load model.onnx (not model_quantized.onnx)
        // In Transformers.js 3.x, use dtype instead of quantized
        classifier = await pipeline('text-classification', MODEL_ID, {
            dtype: 'fp32',  // Use full precision model (model.onnx)
            progress_callback: (progress) => {
                if (progress.status === 'progress' && progress.total) {
                    const pct = Math.round((progress.loaded / progress.total) * 100);
                    updateStatus(`📥 Downloading model... ${pct}%`, 'loading');
                } else if (progress.status === 'done') {
                    console.log('Download complete:', progress.file);
                }
            }
        });
        
        isModelLoaded = true;
        isModelLoading = false;
        
        console.log('✅ Model loaded successfully!');
        
        if (isOnline) {
            updateStatus('🟢 Online - Local model ready', 'success');
        } else {
            updateStatus('📴 Offline - Local model ready', 'warning');
        }
        
    } catch (error) {
        console.error('Failed to load model:', error);
        isModelLoading = false;
        
        if (!isOnline) {
            updateStatus('❌ Offline - Model not available', 'error');
        } else {
            updateStatus('🟢 Online - Using Cloud API', 'success');
        }
    }
}

function updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('apiStatus');
    if (!statusEl) return;
    
    statusEl.textContent = message;
    
    switch (type) {
        case 'success':
            statusEl.style.color = '#10b981';
            break;
        case 'warning':
            statusEl.style.color = '#f59e0b';
            break;
        case 'error':
            statusEl.style.color = '#ef4444';
            break;
        case 'loading':
            statusEl.style.color = '#6366f1';
            break;
        default:
            statusEl.style.color = '#6b7280';
    }
}

async function analyzeText() {
    const text = document.getElementById('inputText').value.trim();
    if (!text) {
        shakeButton();
        return;
    }

    const resultDiv = document.getElementById('result');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const btnText = analyzeBtn.querySelector('.btn-text');
    const btnLoading = analyzeBtn.querySelector('.btn-loading');
    
    // Show loading state
    resultDiv.classList.add('hidden');
    analyzeBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');

    try {
        let result;

        // Priority: Local model > Cloud API
        if (isModelLoaded) {
            // Use local model (works offline!)
            result = await classifyWithLocalModel(text);
        } else if (isOnline) {
            // Use cloud API
            result = await classifyWithApi(text);
        } else {
            // Offline and no model
            throw new Error('No internet connection and model not cached. Please connect to the internet once to download the model.');
        }

        // Display result with animation
        await displayResult(result.prediction, result.confidence, result.allResults);
        
    } catch (error) {
        console.error('Analysis error:', error);
        showError(error.message);
    } finally {
        analyzeBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
}

async function classifyWithLocalModel(text) {
    if (!classifier) {
        throw new Error('Model not loaded');
    }
    
    console.log('🧠 Using local model for inference...');
    const startTime = performance.now();
    
    // Run inference with top_k to get all scores
    const results = await classifier(text, { top_k: 4 });
    
    const inferenceTime = Math.round(performance.now() - startTime);
    console.log(`⚡ Inference took ${inferenceTime}ms`);
    
    // Parse results - Transformers.js returns array of {label, score}
    const allResults = results.map(r => {
        // Label format from model: "LABEL_0", "LABEL_1", etc.
        const labelIndex = parseInt(r.label.replace('LABEL_', ''));
        const labelKey = labelsByIndex[labelIndex] || 'neutral';
        return {
            label: labelKey,
            score: r.score * 100
        };
    }).sort((a, b) => b.score - a.score);
    
    const topResult = allResults[0];
    
    return {
        prediction: topResult.label,
        confidence: topResult.score,
        allResults: allResults
    };
}

async function classifyWithApi(text) {
    console.log('☁️ Using cloud API for inference...');
    
    try {
        // Try new Gradio API format first (call + join pattern)
        let data;
        
        try {
            // New Gradio 4.x API format
            const callResponse = await fetch(`${API_BASE}/call/classify_api`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: [text] })
            });
            
            if (callResponse.ok) {
                const callResult = await callResponse.json();
                const eventId = callResult.event_id;
                
                // Get the result
                const resultResponse = await fetch(`${API_BASE}/call/classify_api/${eventId}`);
                const resultText = await resultResponse.text();
                
                // Parse SSE format
                const lines = resultText.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonData = JSON.parse(line.slice(6));
                        if (jsonData && jsonData[0]) {
                            data = { data: [jsonData[0]] };
                            break;
                        }
                    }
                }
            }
        } catch (e) {
            console.log('New API format failed, trying legacy format...');
        }
        
        // Fallback to legacy /api/predict format
        if (!data) {
            const response = await fetch(`${API_BASE}/api/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: [text] })
            });
            
            if (!response.ok) throw new Error('API error');
            data = await response.json();
        }
        
        if (!data) throw new Error('API error');
        
        if (data.data && data.data[0]) {
            const result = data.data[0];
            
            // Check if result is already JSON (new API returns JSON directly)
            if (typeof result === 'object' && result.prediction) {
                return {
                    prediction: result.prediction,
                    confidence: result.confidence * 100,
                    allResults: result.results.map(r => ({
                        label: r.label,
                        score: r.score * 100
                    }))
                };
            }
            
            // Parse markdown format (legacy API)
            const resultText = result;
            
            // Parse main result: "## 💀 Copium (85.3%)"
            const mainMatch = resultText.match(/## ([💀🙃😌😐]) (\w+) \((\d+\.?\d*)%\)/);
            let prediction = 'neutral';
            let confidence = 50;
            
            if (mainMatch) {
                prediction = mainMatch[2].toLowerCase();
                confidence = parseFloat(mainMatch[3]);
            }
            
            // Parse all scores
            const allResults = [];
            const scoreMatches = resultText.matchAll(/- ([💀🙃😌😐]) \*\*(\w+)\*\*:.*?(\d+\.?\d*)%/g);
            for (const match of scoreMatches) {
                allResults.push({
                    label: match[2].toLowerCase(),
                    score: parseFloat(match[3])
                });
            }
            
            // Fallback if parsing failed
            if (allResults.length === 0) {
                allResults.push(
                    { label: prediction, score: confidence },
                    ...Object.keys(labels).filter(l => l !== prediction).map(l => ({
                        label: l,
                        score: (100 - confidence) / 3
                    }))
                );
            }
            
            return { prediction, confidence, allResults };
        }
        
        throw new Error('Invalid API response');
        
    } catch (error) {
        console.error('API call failed:', error);
        
        // If local model available, use as fallback
        if (isModelLoaded) {
            updateStatus('🟡 API failed - Using local model', 'warning');
            return classifyWithLocalModel(text);
        }
        
        throw error;
    }
}

async function displayResult(prediction, confidence, allResults) {
    const resultDiv = document.getElementById('result');
    const info = labels[prediction] || labels.neutral;
    
    // Set values
    document.getElementById('resultEmoji').textContent = info.emoji;
    document.getElementById('resultLabel').textContent = info.name;
    document.getElementById('resultDescription').textContent = info.description;
    document.getElementById('resultScore').textContent = `${confidence.toFixed(1)}%`;
    
    // Set colors
    document.getElementById('emojiBg').style.background = info.color;
    document.getElementById('resultLabel').style.color = info.color;
    
    const meterFill = document.getElementById('meterFill');
    meterFill.style.width = '0%';
    meterFill.style.background = info.color;
    
    // Show result
    resultDiv.classList.remove('hidden');
    
    // Animate meter
    await new Promise(r => setTimeout(r, 100));
    meterFill.style.width = `${confidence}%`;
    
    // Show all scores
    if (allResults && allResults.length > 0) {
        const scoresDiv = document.getElementById('allScores');
        scoresDiv.innerHTML = allResults.map(r => {
            const labelInfo = labels[r.label] || labels.neutral;
            return `
                <div class="score-item">
                    <span class="score-emoji">${labelInfo.emoji}</span>
                    <span class="score-name">${labelInfo.name}</span>
                    <span class="score-value" style="color: ${labelInfo.color}">${r.score.toFixed(1)}%</span>
                </div>
            `;
        }).join('');
    }
}

function showError(message = 'Something went wrong. Please try again.') {
    const resultDiv = document.getElementById('result');
    resultDiv.classList.remove('hidden');
    document.getElementById('resultEmoji').textContent = '❌';
    document.getElementById('resultLabel').textContent = 'Error';
    document.getElementById('resultLabel').style.color = '#ef4444';
    document.getElementById('resultDescription').textContent = message;
    document.getElementById('resultScore').textContent = '';
    document.getElementById('meterFill').style.width = '0%';
    document.getElementById('allScores').innerHTML = '';
}

function shakeButton() {
    const btn = document.getElementById('analyzeBtn');
    btn.style.animation = 'shake 0.5s ease';
    setTimeout(() => btn.style.animation = '', 500);
}

function setExample(text) {
    const textarea = document.getElementById('inputText');
    textarea.value = text;
    textarea.focus();
    analyzeText();
}

// Add shake animation dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Register Service Worker for offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('ServiceWorker registered:', registration.scope);
        } catch (error) {
            console.log('ServiceWorker registration failed:', error);
        }
    });
}
