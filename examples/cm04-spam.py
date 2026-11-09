"""MLF110 · CM 4 — Régression logistique sur des messages (données fictives).
Toutes les sorties citées dans les notes du CM 4 sont produites par ce script."""
import numpy as np
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import log_loss, confusion_matrix, precision_score, recall_score, f1_score

# 1. Apprentissage : nombre de liens dans le message, spam (1) ou non (0)
liens = np.array([[0], [1], [1], [2], [3], [4], [5], [6]])
spam = np.array([0, 0, 0, 1, 0, 1, 1, 1])

# 2. Pourquoi pas une droite ?
droite = LinearRegression().fit(liens, spam)
print("droite :", droite.intercept_.round(3), droite.coef_.round(3))
print("droite pour 0 et 10 liens :", droite.predict([[0], [10]]).round(2))

# 3. Régression logistique (C = 1 par défaut : pénalité L2, lambda = 1/C)
logit = LogisticRegression().fit(liens, spam)
b, w = logit.intercept_[0], logit.coef_[0, 0]
print("logistique C=1 : b =", round(b, 3), " w =", round(w, 3))
sans_penalite = LogisticRegression(C=1e6).fit(liens, spam)
print("logistique C=1e6 : b =", round(sans_penalite.intercept_[0], 3), " w =", round(sans_penalite.coef_[0, 0], 3))
nouveau = [[3]]
print("score z pour 3 liens :", logit.decision_function(nouveau).round(3))
print("P(spam) pour 3 liens :", logit.predict_proba(nouveau)[:, 1].round(3))
print("frontière p = 0,5 : z = 0  =>  liens =", round(-b / w, 2))

# 4. Log-loss sur l'apprentissage
p_train = logit.predict_proba(liens)[:, 1]
print("log-loss apprentissage :", round(log_loss(spam, p_train), 3))

# 5. Un pas de descente de gradient à la main (w = b = 0, eta = 0,1)
p0 = np.full(len(spam), 0.5)
g_b = np.mean(p0 - spam)
g_w = np.mean((p0 - spam) * liens[:, 0])
print("gradient en (0, 0) : g_b =", g_b, " g_w =", g_w)
print("après un pas eta = 0,1 : b =", -0.1 * g_b, " w =", -0.1 * g_w)

# 6. Décider sur une validation : 10 nouveaux messages
liens_val = np.array([[0], [1], [2], [2], [3], [3], [4], [5], [6], [7]])
spam_val = np.array([0, 0, 0, 1, 0, 1, 0, 1, 1, 1])
p_val = logit.predict_proba(liens_val)[:, 1]
print("p validation :", p_val.round(2))
for t in (0.5, 0.8):
    pred = (p_val >= t).astype(int)
    tn, fp, fn, tp = confusion_matrix(spam_val, pred).ravel()
    print(f"seuil {t} : TP={tp} FP={fp} FN={fn} TN={tn}  précision={precision_score(spam_val, pred):.2f}"
          f"  rappel={recall_score(spam_val, pred):.2f}  F1={f1_score(spam_val, pred):.2f}")
