// Hugging Face Spaces API endpoint
// Update this after deploying to Hugging Face Spaces
const API_URL = "https://kurtesianplane-copium-meter.hf.space/api/predict";

const labels = {
    copium: { name: 'Copium', emoji: '💀', color: '#e91e63' },
    sarcastic: { name: 'Sarcastic', emoji: '🙃', color: '#ff9800' },
    sincere: { name: 'Sincere', emoji: '😌', color: '#4caf50' },
    neutral: { name: 'Neutral', emoji: '😐', color: '#9e9e9e' }
};

// Fallback label mapping (for numeric labels)
const labelsByIndex = {
    0: 'copium',
    1: 'sarcastic', 
    2: 'sincere',
    3: 'neutral'
};

async function analyzeText() {
    const text = document.getElementById('inputText').value.trim();
    if (!text) return;

    const resultDiv = document.getElementById('result');
    const analyzeBtn = document.querySelector('button');
    
    resultDiv.classList.remove('hidden');
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '🔄 Analyzing...';
    
    document.getElementById('resultEmoji').textContent = '⏳';
    document.getElementById('resultLabel').textContent = 'Analyzing...';
    document.getElementById('resultScore').textContent = '';

    try {
        let prediction, confidence;

        // Try API first, fall back to mock if unavailable
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: [text] })
            });
            
            if (!response.ok) throw new Error('API unavailable');
            
            const data = await response.json();
            
            // Parse Gradio response format
            if (data.data && data.data[0]) {
                // Gradio returns markdown, parse it
                const resultText = data.data[0];
                const match = resultText.match(/## ([💀🙃😌😐]) (\w+) \((\d+\.?\d*)%\)/);
                if (match) {
                    prediction = match[2].toLowerCase();
                    confidence = parseFloat(match[3]);
                } else {
                    throw new Error('Could not parse response');
                }
            } else {
                throw new Error('Invalid response format');
            }
        } catch (apiError) {
            console.log('API unavailable, using local inference:', apiError.message);
            const result = mockInference(text);
            prediction = labelsByIndex[result.label];
            confidence = result.confidence;
        }

        displayResult(prediction, confidence);
    } catch (error) {
        console.error('Analysis error:', error);
        document.getElementById('resultEmoji').textContent = '❌';
        document.getElementById('resultLabel').textContent = 'Error';
        document.getElementById('resultScore').textContent = 'Please try again';
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = '🔍 Analyze';
    }
}

function mockInference(text) {
    const lower = text.toLowerCase();
    
    const copiumPatterns = [
        /it'?s? fine/i, /i'?m? not even mad/i, /whatever/i,
        /didn'?t want/i, /doesn'?t matter/i, /who cares/i,
        /at least/i, /could be worse/i, /i'?m? over it/i,
        /no big deal/i, /anyway/i, /i guess/i
    ];
    
    const sarcasmPatterns = [
        /oh great/i, /just what i needed/i, /how wonderful/i,
        /so excited/i, /can'?t wait/i, /amazing/i,
        /totally/i, /obviously/i, /sure/i, /right/i
    ];
    
    const sincerePatterns = [
        /thank you/i, /thanks/i, /appreciate/i, /grateful/i,
        /love this/i, /really helped/i, /glad/i
    ];

    let copiumScore = copiumPatterns.filter(p => p.test(lower)).length;
    let sarcasmScore = sarcasmPatterns.filter(p => p.test(lower)).length;
    let sincereScore = sincerePatterns.filter(p => p.test(lower)).length;

    if (copiumScore > 0 && (lower.includes('anyway') || lower.includes('fine'))) {
        copiumScore += 2;
    }

    const scores = [copiumScore, sarcasmScore, sincereScore, 0];
    const maxScore = Math.max(...scores);
    const label = scores.indexOf(maxScore);
    
    const confidence = Math.min(50 + maxScore * 15 + Math.random() * 20, 99);

    return { label, confidence: Math.round(confidence) };
}

function displayResult(prediction, confidence) {
    const info = labels[prediction] || labels.neutral;
    
    document.getElementById('resultEmoji').textContent = info.emoji;
    document.getElementById('resultLabel').textContent = info.name;
    document.getElementById('resultScore').textContent = `Confidence: ${confidence.toFixed(1)}%`;
    
    const meterFill = document.getElementById('meterFill');
    meterFill.style.width = `${confidence}%`;
    meterFill.style.background = info.color;
}

function setExample(text) {
    document.getElementById('inputText').value = text;
    analyzeText();
}