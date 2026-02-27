from flask import Blueprint, render_template, request, redirect, url_for, jsonify
import json
from .models import Event
from datetime import datetime
from extenstions import db
from sqlalchemy import func


event_bp = Blueprint(
    "event_bp",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="assets",
)


@event_bp.route("/")
def home():
    events = Event.query.all()
    return render_template("event/event.html", events=events)


@event_bp.route("/events", methods=["GET"])
def get_events_as_json():
    try:
        events = Event.query.all()
        event_list = []
        for event in events:
            event_data = event.as_dict()
            event_list.append(event_data)

        return jsonify(event_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@event_bp.route("/events", methods=["POST"])
def add_event_as_json():
    # Accept application/json with optional charset and reject non-JSON payloads.
    if not request.is_json:
        content_type = request.headers.get("Content-Type")
        print(f"Unsupported content type: {content_type}")
        return jsonify({"message": "Content-Type not supported!"}), 415

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"message": "Invalid JSON body"}), 400

    # Keep backward compatibility if payload is accidentally JSON-encoded twice.
    if isinstance(data, str):
        try:
            dataJson = json.loads(data)
        except Exception:
            return jsonify({"message": "Invalid JSON body"}), 400
    else:
        dataJson = data

    if "status" not in dataJson or "video_name" not in dataJson:
        return jsonify({"message": "Missing camera_id or config field in request"}), 400

    try:
        status = dataJson.get("status")
        video_name = dataJson.get("video_name")
        date_time = dataJson.get("datetime") or dataJson.get("date_time")
        Threat_status = dataJson.get("Threat_status")
        image_path = dataJson.get("image_path")

        raw_weapon_images = dataJson.get("weapon_images")
        if isinstance(raw_weapon_images, list):
            weapon_images = raw_weapon_images[0] if raw_weapon_images else ""
        elif raw_weapon_images is None:
            weapon_images = ""
        else:
            weapon_images = str(raw_weapon_images)

        timestamp = datetime.now()
        event = Event(
            status=status,
            video_name=video_name,
            date_time=date_time,
            Threat_status=Threat_status,
            image_path=image_path,
            weapon_images=weapon_images,
            timestamp=timestamp,
        )
        db.session.add(event)
        db.session.commit()
        return jsonify({"message": "Event stored successfully"}), 201
    except Exception as e:
        print(str(e))
        return jsonify({"message": str(e)}), 500


@event_bp.route("/events/<string:event_id>", methods=["GET", "DELETE"])
def get_event_by_id(event_id):
    try:
        event_pk = int(event_id)
    except ValueError:
        return jsonify({"error": "Invalid event id"}), 400

    alert = db.session.get(Event, event_pk)
    if alert is None:
        return jsonify({"error": "Event not found"}), 404

    if request.method == "GET":
        event_data = alert.as_dict()
        return jsonify(event_data), 200

    # DELETE
    try:
        db.session.delete(alert)
        db.session.commit()
        return jsonify({"message": "Event deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@event_bp.route("/events/search", methods=["GET"])
def search_events():
    """Search events by video name or status"""
    try:
        query = request.args.get("q", "").strip()
        if not query:
            return jsonify({"error": "Search query required"}), 400

        # Search in video_name and status fields
        events = Event.query.filter(
            db.or_(
                Event.video_name.ilike(f"%{query}%"),
                Event.status.ilike(f"%{query}%"),
                Event.Threat_status.ilike(f"%{query}%"),
            )
        ).all()

        event_list = [event.as_dict() for event in events]
        return (
            jsonify({"success": True, "count": len(event_list), "results": event_list}),
            200,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@event_bp.route("/events/filter", methods=["GET"])
def filter_events():
    """Filter events by time range, camera name, or weapon count"""
    try:
        # Time range filters
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")

        # Camera filter
        camera_name = request.args.get("camera_name")

        # Search by name
        search_name = request.args.get("search_name")

        # Weapon count filter (minimum weapons detected)
        min_weapons = request.args.get("min_weapons", type=int)

        query = Event.query

        # Apply time filters
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
                query = query.filter(Event.timestamp >= start_dt)
            except ValueError:
                return (
                    jsonify({"error": "Invalid start_date format. Use ISO format"}),
                    400,
                )

        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                query = query.filter(Event.timestamp <= end_dt)
            except ValueError:
                return (
                    jsonify({"error": "Invalid end_date format. Use ISO format"}),
                    400,
                )

        # Apply camera filter
        if camera_name:
            query = query.filter(Event.video_name.ilike(f"%{camera_name}%"))

        # Apply search by name filter
        if search_name:
            query = query.filter(Event.video_name.ilike(f"%{search_name}%"))

        events = query.all()

        # Filter by weapon count in Python (since weapon_images is stored as text)
        event_list = []
        for event in events:
            event_dict = event.as_dict()
            # Count weapons (comma-separated in weapon_images field)
            weapon_count = 0
            if event.weapon_images:
                weapon_count = len(
                    [x for x in event.weapon_images.split(",") if x.strip()]
                )
            event_dict["weapon_count"] = weapon_count

            # Apply min_weapons filter
            if min_weapons is None or weapon_count >= min_weapons:
                event_list.append(event_dict)

        return (
            jsonify({"success": True, "count": len(event_list), "results": event_list}),
            200,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@event_bp.route("/events/sort", methods=["GET"])
def sort_events():
    """Sort events by weapon count or date"""
    try:
        sort_by = request.args.get("sort_by", "timestamp")  # timestamp or weapon_count
        order = request.args.get("order", "desc")  # asc or desc

        events = Event.query.all()
        event_list = []

        for event in events:
            event_dict = event.as_dict()
            # Count weapons
            weapon_count = 0
            if event.weapon_images:
                weapon_count = len(
                    [x for x in event.weapon_images.split(",") if x.strip()]
                )
            event_dict["weapon_count"] = weapon_count
            event_list.append(event_dict)

        # Sort the list - use timestamp field directly for consistent sorting
        reverse = order == "desc"

        def get_sort_key(item):
            if sort_by == "weapon_count":
                return item.get("weapon_count", 0)
            else:
                # Use timestamp for sorting - convert to datetime if needed
                ts = item.get("timestamp")
                if ts:
                    # If it's already a datetime object or ISO string
                    if isinstance(ts, str):
                        try:
                            return datetime.fromisoformat(ts.replace("Z", "+00:00"))
                        except:
                            return datetime.min
                    return ts
                return datetime.min

        # Sort with stable sorting to prevent infinite loops
        event_list = sorted(event_list, key=get_sort_key, reverse=reverse)

        return (
            jsonify({"success": True, "count": len(event_list), "results": event_list}),
            200,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@event_bp.route("/events/grouped", methods=["GET"])
def get_events_grouped():
    """Get events grouped by camera/video name with location info"""
    try:
        events = Event.query.all()

        # Group by video_name (camera)
        grouped = {}
        for event in events:
            camera_name = event.video_name or "Unknown"

            if camera_name not in grouped:
                # Count weapons for this event
                weapon_count = 0
                if event.weapon_images:
                    weapon_count = len(
                        [x for x in event.weapon_images.split(",") if x.strip()]
                    )

                grouped[camera_name] = {
                    "camera_name": camera_name,
                    "location": "Unknown Location",  # Can be enhanced with camera model
                    "event_count": 0,
                    "total_weapons": 0,
                    "events": [],
                }

            # Count weapons for this event
            weapon_count = 0
            if event.weapon_images:
                weapon_count = len(
                    [x for x in event.weapon_images.split(",") if x.strip()]
                )

            grouped[camera_name]["event_count"] += 1
            grouped[camera_name]["total_weapons"] += weapon_count
            grouped[camera_name]["events"].append(event.as_dict())

        return (
            jsonify(
                {
                    "success": True,
                    "camera_count": len(grouped),
                    "cameras": list(grouped.values()),
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500
