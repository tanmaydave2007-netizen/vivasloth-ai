import io
import unittest
from unittest.mock import patch

import app as vivasloth_app


class VivaSlothAppTests(unittest.TestCase):
    def setUp(self):
        vivasloth_app.app.config["TESTING"] = True
        self.client = vivasloth_app.app.test_client()

    def test_home_page_loads_with_new_navigation(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"VivaSloth", response.data)
        self.assertIn(b"Syllabus Map", response.data)
        self.assertIn(b"Screenshot to Notes", response.data)

    def test_sample_practical_is_available(self):
        response = self.client.get("/api/sample")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Linear Search", response.data)

    def test_generate_requires_source(self):
        response = self.client.post("/api/generate", data={"mode": "pack"})
        self.assertEqual(response.status_code, 400)
        self.assertIn(b"Add your syllabus/practical", response.data)

    @patch("app.call_openrouter_model", return_value="## What this practical does\nIt searches a list.")
    def test_generate_with_pasted_material(self, _mock_model):
        response = self.client.post("/api/generate", data={
            "source_text": "def linear_search(items, target): return -1",
            "subject": "Python",
            "practical_title": "Linear Search",
            "mode": "pack",
        })
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertTrue(body["ok"])
        self.assertIn("searches a list", body["result"])

    @patch("app.call_openrouter_model", return_value="## GTU-style answer\nA definition and points.")
    def test_gtu_question_can_be_answered_without_file(self, _mock_model):
        response = self.client.post("/api/generate", data={
            "mode": "gtu", "exam_question": "What is normalization?", "marks": "5", "subject": "DBMS"
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["ok"])

    @patch("app.call_openrouter_model", return_value="REFERENCE SUMMARY:\nThe image shows an SQL query.\nFIRST QUESTION:\nWhat does SELECT do?")
    def test_screenshot_upload_is_sent_as_vision_content(self, mocked_model):
        response = self.client.post("/api/generate", data={
            "mode": "image",
            "documents": (io.BytesIO(b"fake-png-bytes"), "notes.png"),
        }, content_type="multipart/form-data")
        # A fake PNG is still passed as a data URL; the model call is mocked.
        self.assertEqual(response.status_code, 200)
        message = mocked_model.call_args.args[0][1]["content"]
        self.assertIsInstance(message, list)
        self.assertEqual(message[1]["type"], "image_url")
        self.assertTrue(message[1]["image_url"]["url"].startswith("data:image/png;base64,"))

    @patch("app.call_openrouter_model", return_value="What is the purpose of the loop?")
    def test_mock_viva_returns_question_and_source(self, _mock_model):
        response = self.client.post("/api/mock/start", data={
            "source_text": "for i in range(5): print(i)",
            "subject": "Python",
            "practical_title": "Loop",
        })
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body["question"], "What is the purpose of the loop?")
        self.assertIn("range(5)", body["source"])

    @patch("app.call_openrouter_model", side_effect=RuntimeError("OpenRouter API key is missing"))
    def test_text_file_upload_is_read(self, _mock_model):
        file_data = io.BytesIO(b"Aim: find a value in a list")
        response = self.client.post("/api/generate", data={
            "documents": (file_data, "practical.txt"), "mode": "pack",
        }, content_type="multipart/form-data")
        self.assertEqual(response.status_code, 503)
        self.assertIn(b"OpenRouter API key is missing", response.data)


if __name__ == "__main__":
    unittest.main()
