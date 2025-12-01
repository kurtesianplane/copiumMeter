const API_URL = null;

const labels = {
    0: { name: 'Copium', emoji: '💀', color: '#e91e63' },
    1: { name: 'Sarcastic', emoji: '🙃', color: '#ff9800' },
    2: { name: 'Sincere', emoji: '😌', color: '#4caf50' },
    3: { name: 'Neutral', emoji: '😐', color: '#9e9e9e' }
};

async function analyzeText() {
    const text = document.getElementById('inputText').value.trim();
    if (!text) return;

    const resultDiv = document.getElementById('result');
    resultDiv.classList.remove('hidden');

    let prediction;
    let confidence;

    if (API_URL) {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });
        const data = await response.json();
        prediction = data.label;
        confidence = data.confidence;
    } else {
        const result = mockInference(text);
        prediction = result.label;
        confidence = result.confidence;
    }

    displayResult(prediction, confidence);
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
        /i really/i, /i love/i, /i enjoy/i, /thank you/i,
        /happy/i, /glad/i, /appreciate/i, /excited/i
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

function displayResult(label, confidence) {
    const info = labels[label];
    
    document.getElementById('resultEmoji').textContent = info.emoji;
    document.getElementById('resultLabel').textContent = info.name;
    document.getElementById('resultScore').textContent = `Confidence: ${confidence}%`;
    
    const meterFill = document.getElementById('meterFill');
    meterFill.style.width = `${confidence}%`;
    meterFill.style.background = info.color;
}

function setExample(text) {
    document.getElementById('inputText').value = text;
    analyzeText();
}