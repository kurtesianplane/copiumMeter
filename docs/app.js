// Hugging Face Spaces API endpoint
const API_URL = "https://kurtesianplane-copium-meter.hf.space/api/predict";

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

let isApiAvailable = true;

// Check API status on load
async function checkApiStatus() {
    const statusEl = document.getElementById('apiStatus');
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(API_URL.replace('/api/predict', '/'), {
            method: 'GET',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
            isApiAvailable = true;
            statusEl.textContent = '🟢 Connected to Cloud API';
            statusEl.style.color = '#10b981';
        } else {
            throw new Error('API not ready');
        }
    } catch (e) {
        isApiAvailable = false;
        statusEl.textContent = '🟡 Using Local Inference';
        statusEl.style.color = '#f59e0b';
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
        let prediction, confidence, allResults;

        // Try API first
        if (isApiAvailable) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: [text] })
                });
                
                if (!response.ok) throw new Error('API error');
                
                const data = await response.json();
                
                if (data.data && data.data[0]) {
                    const resultText = data.data[0];
                    
                    // Parse main result
                    const mainMatch = resultText.match(/## ([💀🙃😌😐]) (\w+) \((\d+\.?\d*)%\)/);
                    if (mainMatch) {
                        prediction = mainMatch[2].toLowerCase();
                        confidence = parseFloat(mainMatch[3]);
                    }
                    
                    // Parse all scores
                    allResults = [];
                    const scoreMatches = resultText.matchAll(/- ([💀🙃😌😐]) \*\*(\w+)\*\*:.*?(\d+\.?\d*)%/g);
                    for (const match of scoreMatches) {
                        allResults.push({
                            label: match[2].toLowerCase(),
                            score: parseFloat(match[3])
                        });
                    }
                    
                    if (!prediction) throw new Error('Parse error');
                }
            } catch (apiError) {
                console.log('API failed, using local:', apiError.message);
                const result = mockInference(text);
                prediction = labelsByIndex[result.label];
                confidence = result.confidence;
                allResults = result.allResults;
                
                document.getElementById('apiStatus').textContent = '🟡 Using Local Inference';
            }
        } else {
            const result = mockInference(text);
            prediction = labelsByIndex[result.label];
            confidence = result.confidence;
            allResults = result.allResults;
        }

        // Display result with animation
        await displayResult(prediction, confidence, allResults);
        
    } catch (error) {
        console.error('Analysis error:', error);
        showError();
    } finally {
        analyzeBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
}

function mockInference(text) {
    const lower = text.toLowerCase();
    
    const patterns = {
        copium: [
            /didn'?t (even )?(want|need|care)/i,
            /whatever/i, /who cares/i, /doesn'?t matter/i,
            /at least/i, /could be worse/i, /i'?m? over it/i,
            /no big deal/i, /anyway/i, /not like i/i,
            /fine with/i, /i guess/i, /never wanted/i
        ],
        sarcastic: [
            /oh (great|wow|sure|really)/i, /yeah right/i,
            /how (wonderful|surprising|original)/i,
            /what a surprise/i, /totally/i, /obviously/i,
            /shocking/i, /never would have guessed/i,
            /like that'?s? (ever )?gonna happen/i
        ],
        sincere: [
            /thank(s| you)/i, /appreciate/i, /grateful/i,
            /helped? me/i, /love (this|that|it)/i,
            /really (like|enjoy|love)/i, /glad/i, /happy/i,
            /means a lot/i, /so kind/i
        ],
        neutral: [
            /^(the|a|an) \w+/i, /is (at|on|in)/i,
            /starts? at/i, /located/i, /according to/i,
            /^\d+/i, /information/i
        ]
    };

    const scores = {};
    for (const [label, patternList] of Object.entries(patterns)) {
        scores[label] = patternList.filter(p => p.test(lower)).length;
    }
    
    // Boost scores based on context
    if (scores.copium > 0 && (lower.includes('anyway') || lower.includes('fine'))) {
        scores.copium += 1;
    }
    if (scores.sarcastic > 0 && (lower.includes('wow') || lower.includes('oh'))) {
        scores.sarcastic += 1;
    }

    const maxScore = Math.max(...Object.values(scores));
    let label = 3; // default neutral
    
    if (maxScore > 0) {
        const entries = Object.entries(scores);
        const winner = entries.reduce((a, b) => a[1] > b[1] ? a : b);
        label = Object.keys(labelsByIndex).find(k => labelsByIndex[k] === winner[0]);
    }
    
    const confidence = Math.min(45 + maxScore * 18 + Math.random() * 15, 95);
    
    // Generate all results
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    const allResults = Object.entries(scores).map(([name, score]) => ({
        label: name,
        score: Math.max(5, (score / total) * 100 + Math.random() * 10)
    })).sort((a, b) => b.score - a.score);
    
    // Normalize to 100%
    const sum = allResults.reduce((a, b) => a + b.score, 0);
    allResults.forEach(r => r.score = (r.score / sum) * 100);

    return { label: parseInt(label), confidence: Math.round(confidence), allResults };
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

function showError() {
    const resultDiv = document.getElementById('result');
    resultDiv.classList.remove('hidden');
    document.getElementById('resultEmoji').textContent = '❌';
    document.getElementById('resultLabel').textContent = 'Error';
    document.getElementById('resultLabel').style.color = '#ef4444';
    document.getElementById('resultDescription').textContent = 'Something went wrong. Please try again.';
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

// Add shake animation
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Allow Enter key to analyze (Shift+Enter for new line)
document.addEventListener('DOMContentLoaded', () => {
    checkApiStatus();
    
    document.getElementById('inputText').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            analyzeText();
        }
    });
});
