"""Local TabPFN preferences experiment; no story text and no hosted inference."""
import contextlib
import json
import math
import os
from pathlib import Path
import sys
SETTINGS = ("woodland", "seaside", "garden")
MOODS = ("settled", "restless", "tired")
MINUTES = (2, 5, 8)
def clean(payload):
    if not isinstance(payload, dict) or not isinstance(payload.get("rows"), list):
        raise ValueError("Expected rated evenings.")
    rows = payload["rows"]
    if not 20 <= len(rows) <= 200:
        raise ValueError("Rate at least 20 different evenings before using TabPFN (maximum 200).")
    ids = set()
    result = []
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Invalid evening.")
        key = row.get("id")
        if not isinstance(key, str) or not key or len(key) > 100 or key in ids:
            raise ValueError("Each evening must have a unique ID.")
        ids.add(key)
        rating = row.get("rating")
        if type(rating) is not int or rating not in range(1, 6):
            raise ValueError("Ratings must be integers from 1 to 5.")
        if row.get("setting") not in SETTINGS or row.get("mood") not in MOODS or row.get("minutes") not in MINUTES:
            raise ValueError("Unsupported preference.")
        stamp = row.get("createdAt")
        if not isinstance(stamp, str) or len(stamp) < 10 or len(stamp) > 40:
            raise ValueError("Each evening needs its creation timestamp.")
        result.append({k: row[k] for k in ("id", "setting", "mood", "minutes", "rating", "createdAt")})
    if len({row["setting"] for row in result}) < 2 or len({row["rating"] for row in result}) < 2:
        raise ValueError("Try and rate more than one setting before predicting preferences.")
    mood = payload.get("mood")
    if mood not in MOODS:
        raise ValueError("Choose a supported mood.")
    return sorted(result, key=lambda row: row["createdAt"]), mood
def features(row):
    return [int(row["setting"] == value) for value in SETTINGS] + [int(row["mood"] == value) for value in MOODS] + [row["minutes"] / 8]
def evaluate(rows, mood, model):
    split = int(len(rows) * 0.8)
    train, holdout = rows[:split], rows[split:]
    model.fit([features(row) for row in train], [row["rating"] for row in train])
    predicted = [float(v) for v in model.predict([features(row) for row in holdout])]
    if len(predicted) != len(holdout) or not all(math.isfinite(v) for v in predicted):
        raise ValueError("Model returned invalid predictions.")
    baseline = sum(row["rating"] for row in train) / len(train)
    mae = sum(abs(p - row["rating"]) for p, row in zip(predicted, holdout)) / len(holdout)
    baseline_mae = sum(abs(baseline - row["rating"]) for row in holdout) / len(holdout)
    model.fit([features(row) for row in rows], [row["rating"] for row in rows])
    # Recommend only combinations the person has actually tried.
    choices = sorted({(row["setting"], row["minutes"]) for row in rows})
    candidates = [{"setting": setting, "minutes": minutes, "mood": mood} for setting, minutes in choices]
    scores = [float(v) for v in model.predict([features(row) for row in candidates])]
    if len(scores) != len(candidates) or not all(math.isfinite(v) for v in scores):
        raise ValueError("Model returned invalid predictions.")
    index = max(range(len(scores)), key=scores.__getitem__)
    return {"method": "TabPFN", "recommendation": candidates[index], "predictedRating": round(max(1, min(5, scores[index])), 2),
            "evaluation": {"split": "chronological 80/20", "trainRows": len(train), "holdoutRows": len(holdout), "mae": round(mae, 3), "meanBaselineMae": round(baseline_mae, 3), "beatsBaseline": mae < baseline_mae},
            "notice": "An exploratory preference prediction from your ratings, not a sleep or health prediction. A small holdout is uncertain."}
def main():
    rows, mood = clean(json.loads(sys.stdin.read(100000)))
    checkpoint = Path(os.environ.get("TABPFN_MODEL_PATH", ""))
    if not checkpoint.is_file() or checkpoint.suffix != ".safetensors":
        raise ValueError("Configure a licensed local TabPFN safetensors checkpoint first.")
    # Setup and license acceptance happen separately. Never download weights during a request.
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TABPFN_NO_BROWSER"] = "1"
    with contextlib.redirect_stdout(sys.stderr):
        from tabpfn import TabPFNRegressor
        model = TabPFNRegressor(model_path=str(checkpoint.resolve()), device="cpu", n_estimators=4, random_state=42)
        result = evaluate(rows, mood, model)
    print(json.dumps(result, allow_nan=False))
if __name__ == "__main__":
    try:
        main()
    except ValueError as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(2)
    except Exception:
        print(json.dumps({"error": "Local TabPFN inference failed; check the server installation and model access."}))
        sys.exit(1)
