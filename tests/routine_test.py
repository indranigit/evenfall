import unittest
from server.routine import clean, features, evaluate
class RoutineTests(unittest.TestCase):
    def rows(self):
        return [{"id": str(i), "setting": "garden" if i % 2 else "woodland", "mood": "tired", "minutes": 5, "rating": 1 + i % 5, "createdAt": "2026-10-%02dT20:00:00Z" % (i + 1)} for i in range(20)]
    def test_validation_and_order(self):
        rows, mood = clean({"rows": self.rows()[::-1], "mood": "tired"})
        self.assertEqual(rows[0]["id"], "0")
        self.assertEqual(mood, "tired")
        self.assertEqual(len(features(rows[0])), 7)
        self.assertNotIn("text", rows[0])
        with self.assertRaises(ValueError): clean({"rows": rows[:3], "mood": "tired"})
        with self.assertRaises(ValueError): clean({"rows": [rows[0]] * 20, "mood": "tired"})
    def test_chronological_holdout_and_honest_baseline(self):
        class StubRegressor:
            def __init__(self): self.fit_sizes = []
            def fit(self, x, y): self.fit_sizes.append(len(x)); self.average = sum(y) / len(y)
            def predict(self, x): return [self.average] * len(x)
        model = StubRegressor()
        result = evaluate(self.rows(), "restless", model)
        self.assertEqual(model.fit_sizes, [16, 20])
        self.assertEqual(result["evaluation"]["holdoutRows"], 4)
        self.assertEqual(result["evaluation"]["mae"], result["evaluation"]["meanBaselineMae"])
        self.assertFalse(result["evaluation"]["beatsBaseline"])
        self.assertEqual(result["recommendation"]["mood"], "restless")
    def test_nonfinite_model_output_rejected(self):
        class Broken:
            def fit(self, x, y): pass
            def predict(self, x): return [float("nan")] * len(x)
        with self.assertRaises(ValueError): evaluate(self.rows(), "tired", Broken())
if __name__ == "__main__": unittest.main()
