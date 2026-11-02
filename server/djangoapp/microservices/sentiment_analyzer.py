import re

from flask import Flask, jsonify, request


app = Flask(__name__)

POSITIVE_WORDS = {"amazing", "excellent", "fantastic", "good", "great", "helpful", "love", "positive", "wonderful"}
NEGATIVE_WORDS = {"awful", "bad", "disappointing", "hate", "negative", "poor", "terrible", "worst"}


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/analyze")
def analyze():
    payload = request.get_json(silent=True) or {}
    text = payload.get("text")
    if not isinstance(text, str) or not text.strip():
        return jsonify({"error": "A non-empty text value is required."}), 400

    words = re.findall(r"[a-z']+", text.lower())
    score = sum(word in POSITIVE_WORDS for word in words) - sum(word in NEGATIVE_WORDS for word in words)
    sentiment = "positive" if score > 0 else "negative" if score < 0 else "neutral"
    return jsonify({"sentiment": sentiment})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)