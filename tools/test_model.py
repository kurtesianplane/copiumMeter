import torch
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification

MODEL_PATH = '../cloud/copium_model'

labels = {
    0: 'Copium 💀',
    1: 'Sarcastic 🙃',
    2: 'Sincere 😌',
    3: 'Neutral 😐'
}

print("Loading model...")
tokenizer = DistilBertTokenizer.from_pretrained(MODEL_PATH)
model = DistilBertForSequenceClassification.from_pretrained(MODEL_PATH)
model.eval()
print("Model loaded!\n")

def predict(text):
    inputs = tokenizer(text, return_tensors='pt', padding=True, truncation=True, max_length=128)
    with torch.no_grad():
        outputs = model(**inputs)
    probs = torch.softmax(outputs.logits, dim=1)
    pred = torch.argmax(probs, dim=1).item()
    confidence = probs[0][pred].item() * 100
    return pred, confidence

print("=" * 50)
print("CopiumMeter - Local Test")
print("=" * 50)
print("Type a message to analyze. Type 'quit' to exit.\n")

while True:
    text = input("Enter text: ").strip()
    if text.lower() == 'quit':
        break
    if not text:
        continue
    
    label, conf = predict(text)
    print(f"Result: {labels[label]} ({conf:.1f}% confidence)\n")
