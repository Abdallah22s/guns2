from flask import Blueprint, render_template, request, redirect, url_for,jsonify
from .models import Camera
from extenstions import db
import os
import cv2
import time
import threading
from werkzeug.utils import secure_filename

camera_bp = Blueprint('camera_bp', __name__,
    template_folder='templates',
    static_folder='static',
    static_url_path='assets')

@camera_bp.route('/')
def home():
    cameras = Camera.query.all() 
    return render_template("camera/camera.html", cameras=cameras)

@camera_bp.route('/cameras')
def get_cameras_as_json():
    try:
        cameras = Camera.query.all() 
        camera_list = []
        for camera in cameras:
            camera_data = {
                'id': camera.id,
                'name': camera.name,
                'location': camera.location,
                'video_type': camera.video_type,
                'video_link': camera.video_link,
                'frame_skip_size': camera.frame_skip_size,
                'address': camera.address,
                'lat': camera.lat,
                'long': camera.long, 
            }
            camera_list.append(camera_data)
            
        return jsonify(camera_list),200
    except Exception as e:
        return jsonify({"error": str(e)}),500

@camera_bp.route('/cameras/add', methods=["POST"])
def store_camera_config():
    print(request.get_json())
    data = request.get_json()
    name = data.get('name')
    location = data.get('location')
    video_type = data.get('video_type')
    video_link = data.get('video_link')
    frame_skip_size = data.get('frame_skip_size')
    address = data.get('address')
    lat=data.get('lat')
    long=data.get('long')
     
    # Ensure that the JSON request contains the necessary fields
    if 'video_type' not in data or 'video_link' not in data:
        return jsonify({'message': 'Missing camera_id or config field in request'}), 400

    # Store the camera configuration in MongoDB
    try:
       
        camera=Camera(name=name,location=location,video_link=video_link,video_type=video_type,frame_skip_size=frame_skip_size,address=address,lat=lat,long=long)
        db.session.add(camera)
        db.session.commit()
        
        return jsonify({'message': 'Camera configuration stored successfully'}), 201
    except Exception as e:
        print(str(e))
        return jsonify({'message': str(e)}), 500


@camera_bp.route("/cameras/<string:camera_id>", methods=["GET"])
def get_camera_configuration(camera_id):
    print(camera_id)
    camera=Camera.query.get(camera_id)
    if camera is None:
        return jsonify({"error": "Camera not found"}), 404
    if camera:
        # Convert the Camera object to a dictionary
        camera_data = {
                'id': camera.id,
                'name': camera.name,
                'location': camera.location,
                'video_type': camera.video_type,
                'video_link': camera.video_link,
                'frame_skip_size': camera.frame_skip_size,
                'address': camera.address,
                'lat': camera.lat,
                'long': camera.long, 
            }
        
        return jsonify(camera_data), 200
    return "Camera not found", 404

@camera_bp.route('/cameras/update/<string:camera_id>', methods=['PUT'])
def edit_camera_configuration(camera_id):
    try:
        # Get data from the request JSON
        data = request.json
        camera = Camera.query.get(camera_id)
        
        if camera is None:
            return jsonify({"error": "Camera not found"}), 404

        updated_fields = data.get("updated_fields")
        print(updated_fields,camera_id)
        # Check if the camera ID and updated fields are provided
        if not updated_fields:
            print("no update fileds")
            return jsonify({"message": "Missing camera_id or updated_fields"}), 400
         
        for key, value in updated_fields.items():
            setattr(camera, key, value)
        
        db.session.commit()

        return jsonify({"message": "Camera configuration updated successfully"}), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

@camera_bp.route('/cameras/<string:camera_id>', methods=['DELETE'])
def delete_camera_configuration(camera_id):
    try:
        # Get data from the request JSON
        camera = Camera.query.get(camera_id)

        if camera is None:
            return jsonify({"error": "Camera not found"}), 404
        
        db.session.delete(camera)
        db.session.commit()
        return jsonify({"message": "Camera deleted successfully"}), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500


@camera_bp.route('/cameras/upload-video', methods=['POST'])
def upload_video():
    """
    Upload video file to server.
    
    Returns:
        JSON response with video link path
    """
    try:
        # Validate request
        if 'video' not in request.files:
            return jsonify({
                "success": False,
                "error": "No video file provided",
                "message": "Please upload a video file"
            }), 400
        
        video_file = request.files['video']
        
        # Validate file
        if video_file.filename == '':
            return jsonify({
                "success": False,
                "error": "No file selected",
                "message": "Please select a video file"
            }), 400
        
        # Save uploaded video with timestamp
        timestamp = int(time.time())
        filename = f"{timestamp}_{secure_filename(video_file.filename)}"
        upload_folder = os.path.join(os.getcwd(), 'videos', 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        
        video_path = os.path.join(upload_folder, filename)
        video_file.save(video_path)
        
        # Return the relative path for accessing the video
        video_link = f"/videos/uploads/{filename}"
        
        return jsonify({
            "success": True,
            "message": "Video uploaded successfully",
            "video_link": video_link,
            "filename": filename
        }), 200
        
    except Exception as e:
        print(f"Error in upload_video endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Failed to upload video"
        }), 500


@camera_bp.route('/process-video/<string:camera_id>', methods=['POST'])
def process_video(camera_id):
    """
    Process uploaded video for weapon detection.
    
    Args:
        camera_id: Camera identifier
        
    Returns:
        JSON response with processing status and results
    """
    try:
        # Validate request
        if 'video' not in request.files:
            return jsonify({
                "success": False,
                "error": "No video file provided",
                "message": "Please upload a video file"
            }), 400
        
        video_file = request.files['video']
        compute_device = request.form.get('compute_device', 'cpu')
        scan_interval = int(request.form.get('scan_interval', 5))
        
        # Validate file
        if video_file.filename == '':
            return jsonify({
                "success": False,
                "error": "No file selected",
                "message": "Please select a video file"
            }), 400
        
        # Save uploaded video with timestamp
        timestamp = int(time.time())
        filename = f"{timestamp}_{secure_filename(video_file.filename)}"
        upload_folder = os.path.join(os.getcwd(), 'wepapp', 'videos', 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        
        video_path = os.path.join(upload_folder, filename)
        video_file.save(video_path)
        
        # Create unique session ID for this processing
        session_id = f"{camera_id}_{timestamp}"
        output_folder = os.path.join(os.getcwd(), 'wepapp', 'inferences', f'process_{session_id}')
        os.makedirs(output_folder, exist_ok=True)
        
        # Process video in background
        def process_video_background():
            """Background video processing with YOLOv8 inference"""
            try:
                import sys
                sys.path.append(os.path.join(os.getcwd(), 'wepapp'))
                from wepcore.inference_images_weapon_yolov8 import inference_images_weapon
                
                cap = cv2.VideoCapture(video_path)
                if not cap.isOpened():
                    print(f"Error: Cannot open video file {video_path}")
                    return
                
                # Get video properties
                fps = cap.get(cv2.CAP_PROP_FPS)
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                duration = total_frames / fps if fps > 0 else 0
                
                # Calculate frame skip based on interval
                frame_skip = max(int(fps * scan_interval), 1)
                expected_detections = total_frames // frame_skip
                
                print(f"Processing video: {filename}")
                print(f"Duration: {duration:.2f}s, FPS: {fps}, Total frames: {total_frames}")
                print(f"Scan interval: {scan_interval}s, Frame skip: {frame_skip}")
                
                detected_weapons = []
                frame_count = 0
                processed_count = 0
                
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    # Process at specified intervals
                    if frame_count % frame_skip == 0:
                        try:
                            # Run YOLOv8 inference
                            result_image, start_time, end_time, scores, classes = inference_images_weapon(
                                frame, session_id, frame_count
                            )
                            
                            # Check for detections
                            if scores.shape[1] > 0:
                                confidence = float(scores[0][0])
                                if confidence > 0.3:  # Confidence threshold
                                    weapon_timestamp = time.strftime("%d-%m-%Y %H:%M:%S")
                                    weapon_filename = f"weapon_{processed_count:04d}_{confidence:.2f}.jpg"
                                    weapon_path = os.path.join(output_folder, weapon_filename)
                                    
                                    # Save detection image
                                    cv2.imwrite(weapon_path, result_image)
                                    
                                    # Get relative path for public access
                                    rel_path = os.path.relpath(weapon_path, os.path.join(os.getcwd(), 'wepapp', 'inferences'))
                                    
                                    detected_weapons.append({
                                        'id': processed_count,
                                        'status': f"Weapon Detected | Confidence: {confidence:.2%}",
                                        'confidence': round(confidence * 100, 1),
                                        'datetime': weapon_timestamp,
                                        'image_path': f"/public/{rel_path}",
                                        'frame_number': frame_count,
                                        'timestamp_seconds': round(frame_count / fps, 2) if fps > 0 else 0
                                    })
                                    
                                    print(f"Detection #{processed_count}: Confidence {confidence:.2%} at frame {frame_count}")
                                    processed_count += 1
                            
                        except Exception as e:
                            print(f"Error processing frame {frame_count}: {e}")
                    
                    frame_count += 1
                
                cap.release()
                
                # Save results
                import json
                results = {
                    'session_id': session_id,
                    'camera_id': camera_id,
                    'video_filename': filename,
                    'processed_at': time.strftime("%d-%m-%Y %H:%M:%S"),
                    'video_duration': round(duration, 2),
                    'total_frames': total_frames,
                    'scan_interval': scan_interval,
                    'compute_device': compute_device,
                    'detections_count': len(detected_weapons),
                    'detections': detected_weapons
                }
                
                results_path = os.path.join(output_folder, 'results.json')
                with open(results_path, 'w') as f:
                    json.dump(results, f, indent=2)
                
                print(f"✓ Processing complete: {len(detected_weapons)} weapons detected")
                print(f"✓ Results saved to: {results_path}")
                
            except Exception as e:
                print(f"✗ Error in video processing: {e}")
                import traceback
                traceback.print_exc()
        
        # Start background processing
        thread = threading.Thread(target=process_video_background, daemon=True)
        thread.start()
        
        # Return success response
        return jsonify({
            "success": True,
            "message": "Video processing started successfully",
            "data": {
                "session_id": session_id,
                "video_path": video_path,
                "compute_device": compute_device,
                "scan_interval": scan_interval,
                "status": "processing"
            }
        }), 200
        
    except Exception as e:
        print(f"✗ Error in process_video endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Failed to start video processing"
        }), 500


# In-memory store for scan jobs (in production, use Redis or similar)
scan_jobs = {}


@camera_bp.route('/cameras/scan-video/start', methods=['POST'])
def start_scan_video():
    """
    Start scanning a video for weapon detection.
    
    Returns:
        JSON response with job_id for polling status
    """
    try:
        data = request.get_json()
        # Get scan parameters
        video_link = data.get('video_link')
        compute_device = data.get('compute_device', 'cpu')
        model_name = data.get('model', 'yolov9c')
        scan_profile = data.get('scan_profile', 'balanced')
        snapshot_interval_seconds = int(data.get('snapshot_interval_seconds', 5))
        capture_name = data.get('capture_name', 'scan')
        
        if not video_link:
            return jsonify({
                "success": False,
                "error": "No video link provided"
            }), 400
        
        # Generate unique job ID
        import uuid
        job_id = str(uuid.uuid4())[:8]
        
        # Store job info
        scan_jobs[job_id] = {
            'job_id': job_id,
            'status': 'running',
            'progress': 0,
            'eta_seconds': None,
            'message': 'Processing started',
            'video_link': video_link,
            'scan_name': f"scan_{job_id}_{capture_name}",
            'weapon_found': False,
            'weapon_images': [],
            'weapon_images_count': 0
        }
        
        # Start background processing
        def process_scan():
            try:
                import sys
                import os
                original_cwd = os.getcwd()
                
                # Change to wepapp directory for proper module loading
                wepapp_path = os.path.join(os.getcwd(), 'wepapp')
                os.chdir(wepapp_path)
                sys.path.append(wepapp_path)
                
                # Copy wep.ini to current directory if it doesn't exist
                if not os.path.exists('wep.ini'):
                    import shutil
                    shutil.copy('../wep.ini', 'wep.ini')
                
                from wepcore.inference_images_weapon_yolov8 import inference_images_weapon
                
                # Set the model globally
                import wepcore.inference_images_weapon_yolov8 as yolo_inference
                yolo_inference._selected_model = model_name
                
                # Get video path from link (need to go back to original directory)
                video_path = os.path.join(original_cwd, video_link.lstrip('/'))
                if not os.path.exists(video_path):
                    # Try with videos folder prefix
                    video_path = os.path.join(original_cwd, 'videos', 'uploads', os.path.basename(video_link))
                
                cap = cv2.VideoCapture(video_path)
                if not cap.isOpened():
                    scan_jobs[job_id]['status'] = 'failed'
                    scan_jobs[job_id]['message'] = 'Cannot open video file'
                    return
                
                fps = cap.get(cv2.CAP_PROP_FPS)
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                duration = total_frames / fps if fps > 0 else 0
                
                # Calculate frame skip based on snapshot interval
                frame_skip = max(int(fps * snapshot_interval_seconds), 1)
                
                # Create output folder for scan results
                output_folder = os.path.join(os.getcwd(), 'wepapp', 'inferences', scan_jobs[job_id]['scan_name'])
                os.makedirs(output_folder, exist_ok=True)
                
                detected_weapons = []
                frame_count = 0
                processed_count = 0
                
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    if frame_count % frame_skip == 0:
                        try:
                            # Update progress
                            progress = min(95, int((frame_count / total_frames) * 100)) if total_frames > 0 else 0
                            scan_jobs[job_id]['progress'] = progress
                            
                            # Run YOLOv8 inference
                            result_image, start_time, end_time, scores, classes = inference_images_weapon(
                                frame, job_id, frame_count
                            )
                            
                            # Check for detections
                            if scores.shape[1] > 0:
                                confidence = float(scores[0][0])
                                if confidence > 0.15:  # Score threshold from request
                                    weapon_filename = f"weapon_{processed_count:04d}_{confidence:.2f}.jpg"
                                    weapon_path = os.path.join(output_folder, weapon_filename)
                                    cv2.imwrite(weapon_path, result_image)
                                    
                                    detected_weapons.append(weapon_filename)
                                    processed_count += 1
                                    
                        except Exception as e:
                            print(f"Error processing frame {frame_count}: {e}")
                    
                    frame_count += 1
                
                cap.release()
                
                # Update job status
                scan_jobs[job_id]['status'] = 'completed'
                scan_jobs[job_id]['progress'] = 100
                scan_jobs[job_id]['weapon_found'] = len(detected_weapons) > 0
                scan_jobs[job_id]['weapon_images'] = detected_weapons
                scan_jobs[job_id]['weapon_images_count'] = len(detected_weapons)
                scan_jobs[job_id]['message'] = f"Scan completed. Found {len(detected_weapons)} weapons."
                
            except Exception as e:
                print(f"Error in scan processing: {e}")
                import traceback
                traceback.print_exc()
                scan_jobs[job_id]['status'] = 'failed'
                scan_jobs[job_id]['message'] = str(e)
            finally:
                # Restore original working directory
                os.chdir(original_cwd)
        
        # Start processing in background thread
        thread = threading.Thread(target=process_scan, daemon=True)
        thread.start()
        
        return jsonify({
            "success": True,
            "job_id": job_id,
            "message": "Scan started successfully"
        }), 200
        
    except Exception as e:
        print(f"Error starting scan: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@camera_bp.route('/cameras/scan-video/status/<string:job_id>', methods=['GET'])
def get_scan_status(job_id):
    """
    Get the status of a video scan job.
    
    Args:
        job_id: The scan job identifier
        
    Returns:
        JSON response with scan status and results
    """
    try:
        job = scan_jobs.get(job_id)
        if not job:
            return jsonify({
                "success": False,
                "error": "Job not found"
            }), 404
        
        return jsonify(job), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@camera_bp.route('/inference-images/delete', methods=['POST'])
def delete_inference_image():
    """
    Delete an inference image file.
    
    Returns:
        JSON response with deletion status
    """
    try:
        data = request.get_json()
        image_path = data.get('image_path')
        
        if not image_path:
            return jsonify({
                "success": False,
                "error": "No image path provided"
            }), 400
        
        # Security: Ensure path is within inferences folder
        base_path = os.path.join(os.getcwd(), 'wepapp', 'inferences')
        full_path = os.path.join(os.getcwd(), 'wepapp', 'inferences', image_path.lstrip('/'))
        
        # Verify the path is within allowed directory
        real_base = os.path.realpath(base_path)
        real_target = os.path.realpath(full_path)
        
        if not real_target.startswith(real_base):
            return jsonify({
                "success": False,
                "error": "Invalid image path"
            }), 403
        
        if os.path.exists(real_target):
            os.remove(real_target)
            return jsonify({
                "success": True,
                "message": "Image deleted successfully"
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": "Image not found"
            }), 404
            
    except Exception as e:
        print(f"Error deleting image: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
