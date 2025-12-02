from huggingface_hub import HfApi, create_repo, upload_folder
from pathlib import Path

MODEL_PATH = Path("../cloud/copium_model")
REPO_NAME = "copium-meter"

LABELS = {
    0: "Copium 💀 (denial, coping)",
    1: "Sarcastic 🙃 (irony, mocking)", 
    2: "Sincere 😌 (genuine, honest)",
    3: "Neutral 😐 (factual, informational)"
}

MODEL_CARD = """---
language: en
license: mit
tags:
  - text-classification
  - sentiment-analysis
  - distilbert
  - pytorch
datasets:
  - custom
metrics:
  - accuracy
  - f1
pipeline_tag: text-classification
---

# CopiumMeter 🧪

A text classification model that detects **copium** (denial/coping mechanisms), **sarcasm**, **sincere** statements, and **neutral** text.

## Labels

| Label | Description | Example |
|-------|-------------|---------|
| 0 - Copium 💀 | Denial, coping, dismissive | "Whatever, I didn't want it anyway" |
| 1 - Sarcastic 🙃 | Irony, mocking, exaggeration | "Oh wow, what a surprise" |
| 2 - Sincere 😌 | Genuine, honest, appreciative | "Thank you so much, this really helped" |
| 3 - Neutral 😐 | Factual, informational | "The meeting is at 3pm" |

## Usage

```python
from transformers import pipeline

classifier = pipeline("text-classification", model="YOUR_USERNAME/copium-meter")

result = classifier("Whatever, I didn't even want that job anyway")
print(result)
# [{'label': 'LABEL_0', 'score': 0.95}]  # Copium detected!
```

### Direct Usage

```python
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
import torch

tokenizer = DistilBertTokenizer.from_pretrained("YOUR_USERNAME/copium-meter")
model = DistilBertForSequenceClassification.from_pretrained("YOUR_USERNAME/copium-meter")

text = "Oh sure, that's definitely going to work"
inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=128)

with torch.no_grad():
    outputs = model(**inputs)
    probs = torch.softmax(outputs.logits, dim=1)
    pred = torch.argmax(probs, dim=1).item()

labels = ["Copium 💀", "Sarcastic 🙃", "Sincere 😌", "Neutral 😐"]
print(f"Prediction: {labels[pred]} ({probs[0][pred]:.1%} confidence)")
```

## Model Details

- **Base Model**: distilbert-base-uncased
- **Task**: Multi-class text classification (4 classes)
- **Training Data**: Curated dataset from Reddit comments
- **Framework**: PyTorch + Transformers

## Training

Trained using the Hugging Face Transformers library with:
- 10,000 samples (2,500 per class)
- 3 epochs
- AdamW optimizer (lr=5e-5)
- Batch size: 16

## Limitations

- Trained primarily on English Reddit-style text
- May not generalize well to formal writing or other languages
- Sarcasm detection is context-dependent and challenging

## License

MIT License
"""

def main():
    api = HfApi()
    
    user_info = api.whoami()
    username = user_info["name"]
    repo_id = f"{username}/{REPO_NAME}"
    
    print(f"📦 Uploading model to: {repo_id}")
    
    try:
        create_repo(repo_id, repo_type="model", exist_ok=True)
        print(f"✅ Repository created/exists: https://huggingface.co/{repo_id}")
    except Exception as e:
        print(f"Repository creation: {e}")
    
    readme_path = MODEL_PATH / "README.md"
    model_card_content = MODEL_CARD.replace("YOUR_USERNAME", username)
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(model_card_content)
    print("✅ Created README.md")
    
    print("\n📤 Uploading model folder...")
    upload_folder(
        folder_path=str(MODEL_PATH),
        repo_id=repo_id,
        repo_type="model",
    )
    
    print(f"\n🎉 Done! Your model is live at:")
    print(f"   https://huggingface.co/{repo_id}")
    print(f"\n💡 Usage:")
    print(f'   from transformers import pipeline')
    print(f'   classifier = pipeline("text-classification", model="{repo_id}")')


if __name__ == "__main__":
    main()
