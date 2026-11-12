import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, classification_report
import joblib

def generate_synthetic_data(n_samples=6000, seed=42):
    np.random.seed(seed)
    
    # 4 classes: BLACK, RED, YELLOW, GREEN
    data = []
    
    # 1. BLACK (Expectant / Deceased): ~10%
    n_black = int(n_samples * 0.10)
    for _ in range(n_black):
        hr = float(np.clip(np.random.choice([0, np.random.uniform(0, 30)]), 0, 40))
        spo2 = float(np.clip(np.random.choice([0, np.random.uniform(0, 50)]), 0, 60))
        sbp = float(np.clip(np.random.choice([0, np.random.uniform(0, 50)]), 0, 55))
        rr = float(np.clip(np.random.choice([0, np.random.uniform(0, 6)]), 0, 8))
        consciousness = 3  # Unresponsive
        bleeding = int(np.random.choice([0, 1, 2], p=[0.2, 0.3, 0.5]))
        data.append({
            'heartRate': hr,
            'spo2': spo2,
            'systolicBP': sbp,
            'respiratoryRate': rr,
            'consciousness': consciousness,
            'bleeding': bleeding,
            'tag': 'BLACK'
        })

    # 2. RED (Immediate / Critical): ~35%
    n_red = int(n_samples * 0.35)
    for _ in range(n_red):
        # Critical condition: severe respiratory distress, shock, profound tachycardia/bradycardia, or severe bleeding
        pattern = np.random.choice(['shock', 'respiratory', 'coma', 'severe_trauma'])
        if pattern == 'shock':
            hr = float(np.clip(np.random.normal(135, 15), 110, 190))
            spo2 = float(np.clip(np.random.normal(88, 4), 70, 96))
            sbp = float(np.clip(np.random.normal(70, 8), 45, 84))
            rr = float(np.clip(np.random.normal(32, 4), 26, 48))
            consciousness = int(np.random.choice([1, 2, 3], p=[0.4, 0.4, 0.2]))
            bleeding = int(np.random.choice([1, 2], p=[0.3, 0.7]))
        elif pattern == 'respiratory':
            hr = float(np.clip(np.random.normal(120, 12), 95, 160))
            spo2 = float(np.clip(np.random.normal(78, 6), 55, 84))
            sbp = float(np.clip(np.random.normal(115, 18), 85, 170))
            rr = float(np.clip(np.random.choice([np.random.normal(36, 4), np.random.normal(7, 1.5)]), 4, 52))
            consciousness = int(np.random.choice([0, 1, 2], p=[0.2, 0.5, 0.3]))
            bleeding = int(np.random.choice([0, 1], p=[0.8, 0.2]))
        elif pattern == 'coma':
            hr = float(np.clip(np.random.normal(55, 15), 35, 110))
            spo2 = float(np.clip(np.random.normal(86, 5), 70, 94))
            sbp = float(np.clip(np.random.normal(85, 15), 60, 130))
            rr = float(np.clip(np.random.normal(10, 3), 5, 18))
            consciousness = int(np.random.choice([2, 3], p=[0.35, 0.65]))
            bleeding = int(np.random.choice([0, 1], p=[0.7, 0.3]))
        else: # severe trauma
            hr = float(np.clip(np.random.normal(140, 18), 120, 200))
            spo2 = float(np.clip(np.random.normal(84, 5), 65, 92))
            sbp = float(np.clip(np.random.normal(72, 9), 50, 85))
            rr = float(np.clip(np.random.normal(34, 5), 28, 48))
            consciousness = int(np.random.choice([1, 2, 3], p=[0.3, 0.5, 0.2]))
            bleeding = 2
            
        data.append({
            'heartRate': hr,
            'spo2': spo2,
            'systolicBP': sbp,
            'respiratoryRate': rr,
            'consciousness': consciousness,
            'bleeding': bleeding,
            'tag': 'RED'
        })

    # 3. YELLOW (Delayed / Urgent): ~30%
    n_yellow = int(n_samples * 0.30)
    for _ in range(n_yellow):
        hr = float(np.clip(np.random.normal(105, 10), 92, 125))
        spo2 = float(np.clip(np.random.normal(91, 2), 86, 94))
        sbp = float(np.clip(np.random.normal(98, 8), 86, 115))
        rr = float(np.clip(np.random.normal(24, 3), 21, 29))
        consciousness = int(np.random.choice([0, 1], p=[0.7, 0.3]))
        bleeding = int(np.random.choice([0, 1], p=[0.5, 0.5]))
        data.append({
            'heartRate': hr,
            'spo2': spo2,
            'systolicBP': sbp,
            'respiratoryRate': rr,
            'consciousness': consciousness,
            'bleeding': bleeding,
            'tag': 'YELLOW'
        })

    # 4. GREEN (Minor / Non-urgent): ~25%
    n_green = n_samples - (n_black + n_red + n_yellow)
    for _ in range(n_green):
        hr = float(np.clip(np.random.normal(76, 9), 58, 98))
        spo2 = float(np.clip(np.random.normal(98, 1.2), 95, 100))
        sbp = float(np.clip(np.random.normal(120, 10), 100, 140))
        rr = float(np.clip(np.random.normal(16, 2), 12, 20))
        consciousness = 0  # Alert
        bleeding = 0  # None/Mild
        data.append({
            'heartRate': hr,
            'spo2': spo2,
            'systolicBP': sbp,
            'respiratoryRate': rr,
            'consciousness': consciousness,
            'bleeding': bleeding,
            'tag': 'GREEN'
        })

    df = pd.DataFrame(data)
    # Shuffle dataset
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    return df

def train_and_evaluate(output_dir):
    print("Generating synthetic emergency vitals dataset (6,000 cases)...")
    df = generate_synthetic_data(n_samples=6000)
    
    feature_cols = ['heartRate', 'spo2', 'systolicBP', 'respiratoryRate', 'consciousness', 'bleeding']
    X = df[feature_cols]
    y = df['tag']
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print("Training RandomForestClassifier...")
    clf = RandomForestClassifier(
        n_estimators=120,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    clf.fit(X_train, y_train)
    
    y_pred = clf.predict(X_test)
    accuracy = float(accuracy_score(y_test, y_pred))
    f1 = float(f1_score(y_test, y_pred, average='weighted'))
    report = classification_report(y_test, y_pred, output_dict=True)
    
    print(f"Accuracy: {accuracy:.4f} ({accuracy * 100:.2f}%)")
    print(f"F1 Score (weighted): {f1:.4f}")
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Save Model
    model_path = os.path.join(output_dir, 'triage_model.joblib')
    joblib.dump({
        'model': clf,
        'features': feature_cols,
        'classes': list(clf.classes_)
    }, model_path)
    print(f"Model saved to: {model_path}")
    
    # Save Metrics
    metrics_path = os.path.join(output_dir, 'metrics.json')
    metrics_data = {
        'model': 'RandomForestClassifier',
        'accuracy': round(accuracy, 4),
        'f1_score': round(f1, 4),
        'classes': list(clf.classes_),
        'features': feature_cols,
        'classification_report': report,
        'dataset_size': len(df),
        'test_size': len(X_test)
    }
    with open(metrics_path, 'w', encoding='utf-8') as f:
        json.dump(metrics_data, f, indent=2)
    print(f"Metrics saved to: {metrics_path}")

    return metrics_data

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.abspath(__file__))
    train_and_evaluate(base_dir)
