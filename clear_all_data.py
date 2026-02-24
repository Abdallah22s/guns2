#!/usr/bin/env python3
"""
مسح كل الكاميرات والأحداث/التنبيهات من قاعدة البيانات.
تشغيل من جذر المشروع: python clear_all_data.py
"""
import sys
import os

# تشغيل من جذر المشروع
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from extenstions import db
from camera.models import Camera
from event.models import Event

def main():
    with app.app_context():
        n_events = Event.query.delete()
        n_cameras = Camera.query.delete()
        db.session.commit()
        print(f"تم حذف {n_cameras} كاميرا و {n_events} حدث/تنبيه من قاعدة البيانات.")

if __name__ == "__main__":
    main()
