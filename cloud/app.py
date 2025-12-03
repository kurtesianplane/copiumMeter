"""
CopiumMeter API - Hugging Face Spaces Backend
This provides a simple API that can be called from GitHub Pages
"""

import gradio as gr
from transformers import pipeline
import json

# Load the model
print("Loading CopiumMeter model...")
classifier = pipeline(
    "text-classification", 
    model="kurtesianplane/copium-meter",
    top_k=None  # Return all scores
)
print("Model loaded!")

# Label mapping
LABELS = {
    "LABEL_0": {"name": "Copium", "emoji": "💀", "description": "Denial, coping, rationalization"},
    "LABEL_1": {"name": "Sarcastic", "emoji": "🙃", "description": "Irony, mocking, exaggeration"},
    "LABEL_2": {"name": "Sincere", "emoji": "😌", "description": "Genuine, honest, heartfelt"},
    "LABEL_3": {"name": "Neutral", "emoji": "😐", "description": "Factual, objective, informational"}
}

def classify_text(text):
    """Classify text and return formatted results"""
    if not text or not text.strip():
        return "Please enter some text to analyze."
    
    # Get predictions
    results = classifier(text)[0]
    
    # Sort by score descending
    results = sorted(results, key=lambda x: x['score'], reverse=True)
    
    # Format output
    top_result = results[0]
    label_info = LABELS.get(top_result['label'], {"name": "Unknown", "emoji": "❓"})
    confidence = top_result['score'] * 100
    
    # Build response
    output = f"## {label_info['emoji']} {label_info['name']} ({confidence:.1f}%)\n\n"
    output += f"*{label_info.get('description', '')}*\n\n"
    output += "### All Scores:\n"
    
    for result in results:
        info = LABELS.get(result['label'], {"name": "Unknown", "emoji": "❓"})
        bar_length = int(result['score'] * 20)
        bar = "█" * bar_length + "░" * (20 - bar_length)
        output += f"- {info['emoji']} **{info['name']}**: {bar} {result['score']*100:.1f}%\n"
    
    return output

def classify_api(text):
    """API endpoint that returns JSON"""
    if not text or not text.strip():
        return {"error": "No text provided"}
    
    results = classifier(text)[0]
    results = sorted(results, key=lambda x: x['score'], reverse=True)
    
    # Format for API
    formatted = []
    for result in results:
        info = LABELS.get(result['label'], {"name": "Unknown", "emoji": "❓"})
        formatted.append({
            "label": info['name'].lower(),
            "name": info['name'],
            "emoji": info['emoji'],
            "score": result['score'],
            "description": info.get('description', '')
        })
    
    return {
        "prediction": formatted[0]['label'],
        "confidence": formatted[0]['score'],
        "results": formatted
    }

# Create Gradio interface
with gr.Blocks(title="CopiumMeter 🧪") as demo:
    gr.Markdown("""
    # 🧪 CopiumMeter
    ### Detect copium, sarcasm, sincerity, and neutral statements in text
    
    Enter any text below to analyze its tone. This model was trained to detect:
    - 💀 **Copium**: Denial, coping, self-soothing ("Whatever, I didn't want it anyway")
    - 🙃 **Sarcastic**: Irony, mocking ("Oh wow, what a surprise")
    - 😌 **Sincere**: Genuine, honest ("Thank you so much!")
    - 😐 **Neutral**: Factual, informational ("The meeting is at 3pm")
    """)
    
    with gr.Row():
        with gr.Column():
            text_input = gr.Textbox(
                label="Enter text to analyze",
                placeholder="Type something like: 'I'm totally fine with losing, it's not like I even tried anyway'",
                lines=3
            )
            analyze_btn = gr.Button("🔍 Analyze", variant="primary")
        
        with gr.Column():
            output = gr.Markdown(label="Result")
    
    # UI uses markdown output
    analyze_btn.click(fn=classify_text, inputs=text_input, outputs=output)
    text_input.submit(fn=classify_text, inputs=text_input, outputs=output)
    
    # Hidden API endpoint that returns JSON (for programmatic access)
    api_input = gr.Textbox(visible=False)
    api_output = gr.JSON(visible=False)
    demo.load(fn=lambda: None, inputs=None, outputs=None)  # Dummy load
    
    gr.Markdown("""
    ---
    ### API Usage
    
    You can use this as an API endpoint:
    ```
    POST /call/classify_api
    {"data": ["your text here"]}
    
    # Returns event_id, then fetch result from:
    GET /call/classify_api/{event_id}
    ```
    """)

# Add the API function explicitly
demo.queue()
demo.launch()
