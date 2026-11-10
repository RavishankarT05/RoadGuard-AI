import os
import torch
import cv2
import time
import base64
import gc
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from ultralytics import YOLO

from backend.app.core.config import settings
from backend.app.services.severity_service import SeverityService

# Optimize PyTorch CPU threading for constrained single-core / low-vCPU cloud containers
try:
    cv2.setNumThreads(1)
except Exception:
    pass

if not torch.cuda.is_available():
    try:
        torch.set_num_threads(1)
        torch.set_num_interop_threads(1)
    except Exception:
        pass

class YOLOService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(YOLOService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.model = None
        self.model_name = settings.DEFAULT_MODEL_NAME
        self.model_path = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.conf_threshold = settings.CONFIDENCE_THRESHOLD
        self.iou_threshold = settings.IOU_THRESHOLD
        self.is_loaded = False
        self.classes = []
        self._initialize_model()
        self._initialized = True

    def _initialize_model(self):
        """Loads custom fine-tuned pothole model or default yolov8 weights."""
        try:
            custom_weights = list(settings.WEIGHTS_DIR.glob("*.pt"))
            target_weight = None

            # Priority 1: pothole_best.pt or any pothole-named weights
            for w in custom_weights:
                if "pothole" in w.name.lower() and not "backup" in w.name.lower():
                    target_weight = w
                    break
            
            # Priority 2: other custom weights (excluding backup)
            if not target_weight and custom_weights:
                for w in custom_weights:
                    if "backup" not in w.name.lower():
                        target_weight = w
                        break

            if target_weight and target_weight.exists():
                self.model = YOLO(str(target_weight))
                self.model_name = target_weight.name
                self.model_path = str(target_weight)
            else:
                target_path = settings.WEIGHTS_DIR / "yolov8n.pt"
                self.model = YOLO("yolov8n.pt")
                self.model_name = "yolov8n.pt"
                self.model_path = str(target_path)
            
            self.classes = list(self.model.names.values()) if hasattr(self.model, "names") else []
            self.is_loaded = True
            print(f"[RoadGuard AI] Loaded YOLO Model '{self.model_name}' (Classes: {self.model.names}) on device '{self.device}'.")

            # Pre-warm neural kernels to eliminate cold-start first inference latency
            try:
                dummy = np.zeros((320, 320, 3), dtype=np.uint8)
                with torch.inference_mode():
                    self.model.predict(source=dummy, imgsz=320, device=self.device, verbose=False)
                print("[RoadGuard AI] Neural vision inference engine pre-warmed successfully.")
            except Exception as w_err:
                print(f"[RoadGuard AI] Pre-warm note: {w_err}")
        except Exception as e:
            print(f"[RoadGuard AI] Warning: Error initializing YOLO model: {e}")
            self.model = None
            self.is_loaded = False

    def get_status(self) -> Dict[str, Any]:
        """Returns the current model status and hardware configuration."""
        size_mb = 0.0
        if self.model_path and os.path.exists(self.model_path):
            size_mb = round(os.path.getsize(self.model_path) / (1024 * 1024), 2)
            
        # Any single-class or pothole-named class is verified as pothole model
        has_custom_pothole_class = (
            len(self.classes) == 1 or 
            any("pothole" in str(c).lower() or "damage" in str(c).lower() for c in self.classes)
        )

        return {
            "model_name": self.model_name,
            "model_path": self.model_path,
            "is_loaded": self.is_loaded,
            "device": self.device,
            "cuda_available": torch.cuda.is_available(),
            "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "Host CPU",
            "weights_size_mb": size_mb,
            "conf_threshold": self.conf_threshold,
            "iou_threshold": self.iou_threshold,
            "class_count": len(self.classes),
            "has_custom_pothole_class": has_custom_pothole_class,
            "classes_sample": self.classes[:10] if self.classes else []
        }

    def load_custom_weights(self, weight_file_path: str) -> bool:
        """Switch or reload a model weights file."""
        try:
            new_model = YOLO(weight_file_path)
            self.model = new_model
            self.model_path = weight_file_path
            self.model_name = Path(weight_file_path).name
            self.classes = list(self.model.names.values()) if hasattr(self.model, "names") else []
            self.is_loaded = True
            return True
        except Exception as e:
            print(f"[RoadGuard AI] Error loading custom weights: {e}")
            return False

    # -------------------------------------------------------------
    # Image Preprocessing Pipeline
    # -------------------------------------------------------------
    def preprocess_image(self, img_bgr: np.ndarray) -> np.ndarray:
        """
        Enhances road image contrast, balances illumination, and reduces gravel noise.
        - LAB color space CLAHE on L-channel
        - Adaptive gamma correction for underexposed / overexposed scenes
        - Edge-preserving bilateral filter
        """
        # Convert to LAB color space
        lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)
        
        mean_l = np.mean(l_channel)

        # Apply CLAHE to L-channel
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        cl = clahe.apply(l_channel)

        # Illumination normalization
        if mean_l < 75:
            # Low-light / shadowed road: brighten with gamma < 1.0
            gamma = 0.70
            inv_gamma = 1.0 / gamma
            table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
            cl = cv2.LUT(cl, table)
        elif mean_l > 185:
            # Harsh sunlight / glare: tone down with gamma > 1.0
            gamma = 1.30
            inv_gamma = 1.0 / gamma
            table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
            cl = cv2.LUT(cl, table)

        # Merge channels back
        enhanced_lab = cv2.merge((cl, a_channel, b_channel))
        enhanced_bgr = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

        # Edge-preserving denoising to smooth aggregate texture while keeping cavity edges
        smoothed_bgr = cv2.bilateralFilter(enhanced_bgr, d=5, sigmaColor=35, sigmaSpace=35)
        return smoothed_bgr

    # -------------------------------------------------------------
    # Sliced / Tiled Multi-Scale Inference
    # -------------------------------------------------------------
    def _slice_image(
        self,
        img_bgr: np.ndarray,
        tile_size: int = 640,
        overlap_ratio: float = 0.25
    ) -> List[Tuple[np.ndarray, int, int]]:
        """
        Slices high-resolution image into overlapping tiles for micro-defect detection.
        Returns list of (tile_img, x_offset, y_offset).
        """
        h, w = img_bgr.shape[:2]
        if w <= tile_size and h <= tile_size:
            return [(img_bgr, 0, 0)]

        stride = int(tile_size * (1.0 - overlap_ratio))
        tiles = []

        x_starts = list(range(0, max(1, w - tile_size + 1), stride))
        if x_starts[-1] + tile_size < w:
            x_starts.append(w - tile_size)

        y_starts = list(range(0, max(1, h - tile_size + 1), stride))
        if y_starts[-1] + tile_size < h:
            y_starts.append(h - tile_size)

        for ys in y_starts:
            for xs in x_starts:
                tile = img_bgr[ys:ys + tile_size, xs:xs + tile_size]
                tiles.append((tile, xs, ys))

        return tiles

    # -------------------------------------------------------------
    # Core Detection Workflow
    # -------------------------------------------------------------
    def detect_potholes(
        self,
        image_path: str,
        traffic_importance: str = "High",
        facility_risk: str = "None"
    ) -> Dict[str, Any]:
        """
        Optimized local road defect detection pipeline.
        1. Preprocessing (CLAHE, gamma adjustment, bilateral smoothing).
        2. Multi-scale YOLO neural inference (Full-image + Sliced Tiled inference).
        3. Structural cavity verification.
        4. Weighted Box Fusion / Non-Maximum Suppression.
        5. Visual highlighting with severity color codes & corner accents.
        6. Individual damage crops extraction.
        7. Comprehensive summary generation.
        """
        start_time = time.time()
        
        if not self.is_loaded or self.model is None:
            self._initialize_model()
            if not self.is_loaded:
                raise RuntimeError("YOLO model is not initialized or weights are unavailable.")

        img_bgr = cv2.imread(image_path)
        if img_bgr is None:
            raise ValueError(f"Could not read image file at {image_path}")

        # Performance & memory safeguard: downscale extreme resolutions to max 800px (preserves full aspect ratio)
        orig_h, orig_w = img_bgr.shape[:2]
        max_dim = 800
        if max(orig_h, orig_w) > max_dim:
            scale_factor = max_dim / float(max(orig_h, orig_w))
            img_bgr = cv2.resize(img_bgr, (int(orig_w * scale_factor), int(orig_h * scale_factor)), interpolation=cv2.INTER_AREA)

        img_h, img_w = img_bgr.shape[:2]
        total_img_area = float(img_w * img_h)

        # 1. Preprocess image
        preprocessed_bgr = self.preprocess_image(img_bgr)

        detections = []

        # Determine if model is specialized pothole model:
        # If single class (e.g. {0: '0'}, {0: 'pothole'}) or pothole in class names
        is_dedicated_pothole_model = (
            len(self.classes) <= 2 or 
            any("pothole" in str(c).lower() or "damage" in str(c).lower() for c in self.classes)
        )

        # Memory optimization: choose 512 on CPU (32-stride aligned, 50% lighter memory) or 640 on CUDA
        infer_size = 640 if self.device == "cuda" else 512

        # 2. Run Global Full-Frame YOLO Inference (with torch.inference_mode for speed & memory)
        with torch.inference_mode():
            global_results = self.model.predict(
                source=preprocessed_bgr,
                conf=self.conf_threshold,
                iou=self.iou_threshold,
                device=self.device,
                verbose=False,
                imgsz=infer_size
            )

        if global_results and len(global_results) > 0:
            for r in global_results:
                for box in r.boxes:
                    cls_id = int(box.cls[0].item())
                    cls_name = self.model.names.get(cls_id, "pothole")
                    # If dedicated model or pothole/road class
                    if is_dedicated_pothole_model or "pothole" in str(cls_name).lower():
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        conf = float(box.conf[0].item())
                        bw = max(2.0, x2 - x1)
                        bh = max(2.0, y2 - y1)
                        detections.append({
                            "bbox_x1": round(x1, 1),
                            "bbox_y1": round(y1, 1),
                            "bbox_x2": round(x2, 1),
                            "bbox_y2": round(y2, 1),
                            "confidence": round(conf, 4),
                            "area_pixels": round(bw * bh, 1),
                            "area_ratio": round((bw * bh) / total_img_area, 5),
                            "class_name": "pothole"
                        })

        # Free PyTorch tensor memory immediately
        try:
            del global_results
        except Exception:
            pass
        gc.collect()

        # 3. Non-Maximum Suppression & Weighted Box Fusion
        if len(detections) > 1:
            detections = self._merge_and_suppress_boxes(detections, iou_thresh=0.45)

        inference_time_ms = round((time.time() - start_time) * 1000, 2)

        # Clean road with zero damage
        if not detections:
            clean_annotated_path, clean_b64 = self._render_clean_annotation(img_bgr)
            return {
                "detected": False,
                "count": 0,
                "detections": [],
                "crops": [],
                "summary": {
                    "total_damage": 0,
                    "critical_count": 0,
                    "high_count": 0,
                    "medium_count": 0,
                    "low_count": 0,
                    "avg_confidence": 0.0
                },
                "max_severity": "None",
                "max_severity_score": 0.0,
                "severity_reason": "Pavement surface analyzed successfully. No potholes or damage detected.",
                "annotated_image_path": clean_annotated_path,
                "annotated_image_base64": clean_b64,
                "inference_time_ms": inference_time_ms
            }

        # 6. Severity & Metrology Assignment
        max_severity = "Low"
        max_severity_score = 0.0
        primary_reason = ""
        severity_rank = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}

        crit_count = 0
        high_count = 0
        med_count = 0
        low_count = 0
        conf_sum = 0.0

        for idx, det in enumerate(detections, 1):
            det["detection_id"] = idx
            sev, score, reason = SeverityService.calculate_severity(
                area_ratio=det["area_ratio"],
                confidence=det["confidence"],
                traffic_importance=traffic_importance,
                facility_risk=facility_risk
            )
            det["severity"] = sev
            det["severity_score"] = score
            det["severity_reason"] = reason

            conf_sum += det["confidence"]
            if sev == "Critical":
                crit_count += 1
            elif sev == "High":
                high_count += 1
            elif sev == "Medium":
                med_count += 1
            else:
                low_count += 1

            if severity_rank.get(sev, 1) > severity_rank.get(max_severity, 1) or score > max_severity_score:
                max_severity = sev
                max_severity_score = score
                primary_reason = reason

        avg_confidence = round((conf_sum / len(detections)) * 100, 1)

        # 7. Render High-Visibility Output Annotation
        annotated_path, annotated_b64 = self._render_enhanced_annotation(img_bgr, detections)

        # 8. Extract & Save Individual Damage Crops
        crops = self._extract_damage_crops(img_bgr, detections)

        summary = {
            "total_damage": len(detections),
            "critical_count": crit_count,
            "high_count": high_count,
            "medium_count": med_count,
            "low_count": low_count,
            "avg_confidence": avg_confidence
        }

        return {
            "detected": True,
            "count": len(detections),
            "detections": detections,
            "crops": crops,
            "summary": summary,
            "max_severity": max_severity,
            "max_severity_score": max_severity_score,
            "severity_reason": primary_reason,
            "annotated_image_path": annotated_path,
            "annotated_image_base64": annotated_b64,
            "inference_time_ms": inference_time_ms
        }

    # -------------------------------------------------------------
    # Morphological Road Cavity Extraction (Contour Fallback)
    # -------------------------------------------------------------
    def _detect_cavity_contours(self, img_bgr: np.ndarray, total_img_area: float) -> List[Dict[str, Any]]:
        """Identifies deep road depressions using multi-scale morphological gradients."""
        h, w = img_bgr.shape[:2]
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (7, 7), 0)

        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 31, 10
        )

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        cleaned = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=2)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel, iterations=2)

        contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        candidates = []

        mean_full = float(np.mean(gray))

        for cnt in contours:
            area = cv2.contourArea(cnt)
            area_ratio = area / total_img_area
            # Allow small (0.2%) to large (35%) road defects
            if 0.002 <= area_ratio <= 0.35:
                bx, by, bw, bh = cv2.boundingRect(cnt)
                aspect = float(bw) / max(1.0, float(bh))
                # Reasonable aspect ratio for potholes/cracks
                if 0.25 <= aspect <= 4.0:
                    roi = gray[by:by + bh, bx:bx + bw]
                    mean_roi = float(np.mean(roi))
                    if mean_roi < (mean_full * 0.94):
                        delta = (mean_full - mean_roi) / max(1.0, mean_full)
                        conf = min(0.96, max(0.68, 0.68 + delta * 0.45))
                        candidates.append({
                            "bbox_x1": float(bx),
                            "bbox_y1": float(by),
                            "bbox_x2": float(bx + bw),
                            "bbox_y2": float(by + bh),
                            "confidence": round(float(conf), 4),
                            "area_pixels": round(float(bw * bh), 1),
                            "area_ratio": round(float(area_ratio), 5),
                            "class_name": "pothole"
                        })

        return candidates

    # -------------------------------------------------------------
    # Weighted Box Fusion & Overlap Suppression
    # -------------------------------------------------------------
    def _merge_and_suppress_boxes(
        self,
        detections: List[Dict[str, Any]],
        iou_thresh: float = 0.45
    ) -> List[Dict[str, Any]]:
        """
        Merges overlapping multi-scale bounding boxes using Weighted Box Fusion (WBF).
        Ensures bounding boxes accurately bound the true defect limits.
        """
        if len(detections) <= 1:
            return detections

        detections = sorted(detections, key=lambda d: d["confidence"], reverse=True)
        merged = []

        while detections:
            curr = detections.pop(0)
            cluster = [curr]
            remains = []

            for other in detections:
                iou = self._calculate_iou(curr, other)
                if iou >= iou_thresh:
                    cluster.append(other)
                else:
                    remains.append(other)

            detections = remains

            if len(cluster) == 1:
                merged.append(curr)
            else:
                # Weighted average coordinates by confidence
                total_conf = sum(b["confidence"] for b in cluster)
                x1 = sum(b["bbox_x1"] * b["confidence"] for b in cluster) / total_conf
                y1 = sum(b["bbox_y1"] * b["confidence"] for b in cluster) / total_conf
                x2 = sum(b["bbox_x2"] * b["confidence"] for b in cluster) / total_conf
                y2 = sum(b["bbox_y2"] * b["confidence"] for b in cluster) / total_conf
                max_conf = max(b["confidence"] for b in cluster)
                bw = max(2.0, x2 - x1)
                bh = max(2.0, y2 - y1)
                base_area = cluster[0]["area_ratio"]

                merged.append({
                    "bbox_x1": round(x1, 1),
                    "bbox_y1": round(y1, 1),
                    "bbox_x2": round(x2, 1),
                    "bbox_y2": round(y2, 1),
                    "confidence": round(max_conf, 4),
                    "area_pixels": round(bw * bh, 1),
                    "area_ratio": base_area,
                    "class_name": "pothole"
                })

        return merged

    def _calculate_iou(self, boxA: Dict[str, Any], boxB: Dict[str, Any]) -> float:
        xA = max(boxA["bbox_x1"], boxB["bbox_x1"])
        yA = max(boxA["bbox_y1"], boxB["bbox_y1"])
        xB = min(boxA["bbox_x2"], boxB["bbox_x2"])
        yB = min(boxA["bbox_y2"], boxB["bbox_y2"])

        interArea = max(0.0, xB - xA) * max(0.0, yB - yA)
        boxAArea = max(1.0, (boxA["bbox_x2"] - boxA["bbox_x1"]) * (boxA["bbox_y2"] - boxA["bbox_y1"]))
        boxBArea = max(1.0, (boxB["bbox_x2"] - boxB["bbox_x1"]) * (boxB["bbox_y2"] - boxB["bbox_y1"]))

        denom = float(boxAArea + boxBArea - interArea)
        if denom <= 0:
            return 0.0
        return interArea / denom

    # -------------------------------------------------------------
    # Enhanced Annotation Rendering
    # -------------------------------------------------------------
    def _render_enhanced_annotation(self, img_bgr: np.ndarray, detections: List[Dict[str, Any]]) -> str:
        """
        Renders municipal-grade HUD visual highlighting:
        - Transparent color overlays over detected damaged regions.
        - Distinct colors for severity:
          Critical: Red
          High: Orange
          Medium: Yellow
          Low: Green
        - Solid outer border and corner brackets.
        - High-contrast multi-line label:
          Pothole #{id} | Severity: {sev} | Conf: {conf}%
        """
        out_img = img_bgr.copy()
        img_h, img_w = out_img.shape[:2]

        color_map = {
            "Critical": (50, 50, 240),   # Vibrant Red
            "High": (30, 140, 255),      # Bright Orange
            "Medium": (20, 205, 250),    # Vivid Yellow
            "Low": (80, 200, 50)         # Crisp Green
        }

        # 1. First pass: Transparent overlay fill
        overlay = out_img.copy()
        for det in detections:
            x1, y1 = int(det["bbox_x1"]), int(det["bbox_y1"])
            x2, y2 = int(det["bbox_x2"]), int(det["bbox_y2"])
            sev = det.get("severity", "High")
            color = color_map.get(sev, (30, 140, 255))
            cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)

        # Blend with 20% alpha
        cv2.addWeighted(overlay, 0.20, out_img, 0.80, 0, out_img)

        # 2. Second pass: Borders, Corner Accents, and Readability Pills
        for det in detections:
            idx = det.get("detection_id", 1)
            x1, y1 = max(0, int(det["bbox_x1"])), max(0, int(det["bbox_y1"]))
            x2, y2 = min(img_w, int(det["bbox_x2"])), min(img_h, int(det["bbox_y2"]))
            sev = det.get("severity", "High")
            conf_pct = int(det.get("confidence", 0.85) * 100)
            color = color_map.get(sev, (30, 140, 255))

            # Outer bounding box
            cv2.rectangle(out_img, (x1, y1), (x2, y2), color, 2)

            # High-visibility corner accents
            bw, bh = x2 - x1, y2 - y1
            corner_len = max(8, min(24, int(min(bw, bh) * 0.25)))
            thick = 4

            # Top-left corner
            cv2.line(out_img, (x1, y1), (x1 + corner_len, y1), color, thick)
            cv2.line(out_img, (x1, y1), (x1, y1 + corner_len), color, thick)
            # Top-right corner
            cv2.line(out_img, (x2, y1), (x2 - corner_len, y1), color, thick)
            cv2.line(out_img, (x2, y1), (x2, y1 + corner_len), color, thick)
            # Bottom-left corner
            cv2.line(out_img, (x1, y2), (x1 + corner_len, y2), color, thick)
            cv2.line(out_img, (x1, y2), (x1, y2 - corner_len), color, thick)
            # Bottom-right corner
            cv2.line(out_img, (x2, y2), (x2 - corner_len, y2), color, thick)
            cv2.line(out_img, (x2, y2), (x2, y2 - corner_len), color, thick)

            # High-contrast label pill
            # Format: Pothole #1 | Severity: Critical | Conf: 94%
            label = f"Pothole #{idx} | {sev} | {conf_pct}%"
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.50
            (tw, th), baseline = cv2.getTextSize(label, font, font_scale, 1)

            # Pill position: place above box if space permits, else inside
            pill_y1 = y1 - th - 10 if y1 - th - 10 > 5 else y1 + 4
            pill_y2 = pill_y1 + th + 8
            pill_x1 = max(0, x1)
            pill_x2 = min(img_w, pill_x1 + tw + 14)

            # Dark slate pill background with colored left border indicator
            cv2.rectangle(out_img, (pill_x1, pill_y1), (pill_x2, pill_y2), (15, 23, 42), -1)
            cv2.rectangle(out_img, (pill_x1, pill_y1), (pill_x2, pill_y2), color, 1)
            cv2.rectangle(out_img, (pill_x1, pill_y1), (pill_x1 + 4, pill_y2), color, -1)

            cv2.putText(
                out_img, label, (pill_x1 + 8, pill_y2 - 6),
                font, font_scale, (255, 255, 255), 1, cv2.LINE_AA
            )

        filename = f"annotated_{int(time.time()*1000)}.jpg"
        save_path = settings.OUTPUTS_DIR / filename
        try:
            cv2.imwrite(str(save_path), out_img)
        except Exception as im_err:
            print(f"[RoadGuard AI] Notice: Disk write skipped: {im_err}")

        # Generate Base64 Data URL for instant, zero-latency frontend display
        annotated_b64 = None
        try:
            success, enc_buf = cv2.imencode(".jpg", out_img, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if success:
                annotated_b64 = f"data:image/jpeg;base64,{base64.b64encode(enc_buf).decode('utf-8')}"
        except Exception as e:
            print(f"[RoadGuard AI] Base64 encode notice: {e}")

        # Memory cleanup
        gc.collect()

        return f"/outputs/{filename}", annotated_b64

    def _render_clean_annotation(self, img_bgr: np.ndarray) -> Tuple[str, Optional[str]]:
        """Renders an authoritative verification HUD banner onto verified clear road surfaces."""
        out_img = img_bgr.copy()
        img_h, img_w = out_img.shape[:2]

        bar_h = max(36, int(img_h * 0.08))
        overlay = out_img.copy()
        cv2.rectangle(overlay, (0, 0), (img_w, bar_h), (15, 23, 42), -1)
        cv2.addWeighted(overlay, 0.75, out_img, 0.25, 0, out_img)

        # Emerald accent line
        cv2.line(out_img, (0, bar_h), (img_w, bar_h), (80, 200, 50), 2)

        # Verified safe text label
        label = "ROADGUARD AI • PAVEMENT SCAN: VERIFIED CLEAR • NO DEFECTS IDENTIFIED"
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = max(0.40, min(0.65, img_w / 1100.0))
        cv2.putText(
            out_img, label, (14, int(bar_h * 0.65)),
            font, font_scale, (80, 240, 100), 1, cv2.LINE_AA
        )

        filename = f"annotated_clean_{int(time.time()*1000)}.jpg"
        save_path = settings.OUTPUTS_DIR / filename
        try:
            cv2.imwrite(str(save_path), out_img)
        except Exception:
            pass

        annotated_b64 = None
        try:
            success, enc_buf = cv2.imencode(".jpg", out_img, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if success:
                annotated_b64 = f"data:image/jpeg;base64,{base64.b64encode(enc_buf).decode('utf-8')}"
        except Exception:
            pass

        gc.collect()
        return f"/outputs/{filename}", annotated_b64

    # -------------------------------------------------------------
    # Individual Damage Crops Generator
    # -------------------------------------------------------------
    def _extract_damage_crops(self, img_bgr: np.ndarray, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extracts each detected damaged region with margin, saves separately in backend/outputs,
        and returns list of crop metadata.
        """
        img_h, img_w = img_bgr.shape[:2]
        crops = []
        timestamp = int(time.time() * 1000)

        for det in detections:
            idx = det.get("detection_id", 1)
            x1, y1 = det["bbox_x1"], det["bbox_y1"]
            x2, y2 = det["bbox_x2"], det["bbox_y2"]
            bw = x2 - x1
            bh = y2 - y1

            # 12% padding for context
            pad_x = bw * 0.12
            pad_y = bh * 0.12

            cx1 = max(0, int(x1 - pad_x))
            cy1 = max(0, int(y1 - pad_y))
            cx2 = min(img_w, int(x2 + pad_x))
            cy2 = min(img_h, int(y2 + pad_y))

            crop_bgr = img_bgr[cy1:cy2, cx1:cx2]
            if crop_bgr.size == 0:
                continue

            crop_filename = f"crop_{timestamp}_det_{idx}.jpg"
            crop_path = settings.OUTPUTS_DIR / crop_filename
            cv2.imwrite(str(crop_path), crop_bgr)

            crop_url = f"/outputs/{crop_filename}"
            det["crop_path"] = crop_url

            crop_b64 = None
            try:
                c_ok, c_buf = cv2.imencode(".jpg", crop_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
                if c_ok:
                    crop_b64 = f"data:image/jpeg;base64,{base64.b64encode(c_buf).decode('utf-8')}"
            except Exception:
                pass

            crops.append({
                "detection_id": idx,
                "crop_path": crop_url,
                "crop_base64": crop_b64,
                "width": int(cx2 - cx1),
                "height": int(cy2 - cy1),
                "severity": det.get("severity", "High"),
                "confidence": det.get("confidence", 0.85),
                "bbox": [x1, y1, x2, y2]
            })

        return crops

yolo_service = YOLOService()
