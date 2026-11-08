import os
import glob
import cv2
import numpy as np

def compute_iou(box1, box2):
    """
    box: [xmin, ymin, xmax, ymax]
    """
    xA = max(box1[0], box2[0])
    yA = max(box1[1], box2[1])
    xB = min(box1[2], box2[2])
    yB = min(box1[3], box2[3])

    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = (box1[2] - box1[0]) * (box1[3] - box1[1])
    boxBArea = (box2[2] - box2[0]) * (box2[3] - box2[1])

    denom = float(boxAArea + boxBArea - interArea)
    if denom <= 0:
        return 0.0
    return interArea / denom

def load_ground_truth(val_dir='test_data/val'):
    gt_dict = {}
    label_files = glob.glob(f'{val_dir}/labels/*.txt')
    for lf in label_files:
        base = os.path.splitext(os.path.basename(lf))[0]
        img_path = f'{val_dir}/images/{base}.jpg'
        if not os.path.exists(img_path):
            continue
        img = cv2.imread(img_path)
        h, w = img.shape[:2]

        boxes = []
        with open(lf, 'r') as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) >= 5:
                    cls_id, xc, yc, bw, bh = [float(x) for x in parts[:5]]
                    xmin = (xc - bw / 2) * w
                    ymin = (yc - bh / 2) * h
                    xmax = (xc + bw / 2) * w
                    ymax = (yc + bh / 2) * h
                    boxes.append([xmin, ymin, xmax, ymax])
        gt_dict[base] = {'boxes': boxes, 'h': h, 'w': w, 'path': img_path}
    return gt_dict

def evaluate_detector(detect_fn, val_dir='test_data/val', iou_thresh=0.5):
    gt_dict = load_ground_truth(val_dir)
    total_gt = sum(len(v['boxes']) for v in gt_dict.values())
    
    tp = 0
    fp = 0
    fn = 0
    
    all_ious = []

    for base, data in gt_dict.items():
        gt_boxes = data['boxes'].copy()
        pred_boxes = detect_fn(data['path'])

        matched_gt = set()
        for p_box in pred_boxes:
            best_iou = 0.0
            best_gt_idx = -1
            for g_idx, g_box in enumerate(gt_boxes):
                if g_idx in matched_gt:
                    continue
                iou = compute_iou(p_box, g_box)
                if iou > best_iou:
                    best_iou = iou
                    best_gt_idx = g_idx
            
            all_ious.append(best_iou)
            if best_iou >= iou_thresh:
                tp += 1
                matched_gt.add(best_gt_idx)
            else:
                fp += 1
                
        fn += (len(gt_boxes) - len(matched_gt))

    precision = tp / max(1, tp + fp)
    recall = tp / max(1, tp + fn)
    f1 = (2 * precision * recall) / max(1e-6, precision + recall)

    return {
        'total_gt': total_gt,
        'tp': tp,
        'fp': fp,
        'fn': fn,
        'precision': round(precision, 4),
        'recall': round(recall, 4),
        'f1': round(f1, 4),
        'mean_iou': round(float(np.mean(all_ious)) if all_ious else 0.0, 4)
    }

if __name__ == '__main__':
    import sys
    sys.path.insert(0, os.path.abspath('.'))
    from backend.app.services.yolo_service import yolo_service
    
    def old_detect_wrapper(img_path):
        res = yolo_service.detect_potholes(img_path)
        boxes = []
        for d in res.get('detections', []):
            boxes.append([d['bbox_x1'], d['bbox_y1'], d['bbox_x2'], d['bbox_y2']])
        return boxes

    print('Evaluating existing detection service...')
    metrics = evaluate_detector(old_detect_wrapper)
    print('Baseline Metrics:', metrics)
