import unittest

from app import app
from event.models import Event
from extenstions import db


class EventApiTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.inserted_ids = []

    def tearDown(self):
        with app.app_context():
            for event_id in self.inserted_ids:
                event = Event.query.get(event_id)
                if event is not None:
                    db.session.delete(event)
            db.session.commit()

    def _create_event(self, payload):
        response = self.client.post("/api/event/events", json=payload)
        self.assertEqual(response.status_code, 201)

        with app.app_context():
            latest = Event.query.order_by(Event.id.desc()).first()
            self.assertIsNotNone(latest)
            self.inserted_ids.append(latest.id)
            return latest

    def test_accepts_json_with_charset(self):
        response = self.client.post(
            "/api/event/events",
            data='{"status":"detected","video_name":"cam-a"}',
            headers={"Content-Type": "application/json; charset=utf-8"},
        )
        self.assertEqual(response.status_code, 201)

        with app.app_context():
            latest = Event.query.order_by(Event.id.desc()).first()
            self.assertIsNotNone(latest)
            self.inserted_ids.append(latest.id)

    def test_stores_weapon_images_string_without_truncation(self):
        payload = {
            "status": "detected",
            "video_name": "cam-b",
            "date_time": "2026-02-22 10:00:00",
            "Threat_status": "Gun",
            "image_path": "image.jpg",
            "weapon_images": "abc.jpg",
        }
        latest = self._create_event(payload)
        self.assertEqual(latest.weapon_images, "abc.jpg")

    def test_rejects_non_json_content_type(self):
        response = self.client.post("/api/event/events", data="{}")
        self.assertEqual(response.status_code, 415)


if __name__ == "__main__":
    unittest.main()
