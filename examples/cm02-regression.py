"""MLF110 · CM 2 : ajuster, lire et améliorer une régression.

Données fictives : télécharger cm02-loyers.json dans le même dossier.
Installer : python -m pip install numpy pandas "scikit-learn>=1.4" matplotlib
Lancer    : python cm02-regression.py
Figures   : python cm02-regression.py --figures figures

Les sorties du site proviennent de ce script. Aucun Python n'est exécuté
par les boutons de révélation dans le navigateur.
"""
import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.dummy import DummyRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score, root_mean_squared_error
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

NUM = ["surface", "distance"]
FEATURES = NUM + ["age"]  # âge : années depuis la construction ou la dernière rénovation


def make_model(scale=False):
    """La préparation fait partie du modèle et apprend sur train seul."""
    steps = [SimpleImputer(strategy="median")] + ([StandardScaler()] if scale else [])
    return make_pipeline(*steps, LinearRegression())


def metrics(y, pred):
    return {"mae": float(mean_absolute_error(y, pred)),
            "rmse": float(root_mean_squared_error(y, pred)),
            "r2": float(r2_score(y, pred)),
            "max_error": float(np.max(np.abs(np.asarray(y) - pred)))}


def run(data_path):
    data = json.loads(data_path.read_text(encoding="utf-8"))
    train, validation, test = [pd.DataFrame(data[k], columns=data["columns"]) for k in ("train", "validation", "test")]
    # 1. Ajuster uniquement sur les huit logements d'apprentissage.
    baseline = DummyRegressor(strategy="mean").fit(train[NUM], train.loyer)
    numeric = LinearRegression().fit(train[NUM], train.loyer)
    with_age = make_model().fit(train[FEATURES], train.loyer)
    candidates = {"baseline": (baseline, NUM), "numeric": (numeric, NUM), "age": (with_age, FEATURES)}

    # 2. Comparer sur les MÊMES annonces de validation, jamais avec fit(validation).
    scores, predictions = {}, {}
    for name, (model, cols) in candidates.items():
        scores[name], predictions[name] = {}, {}
        for split, frame in (("train", train), ("validation", validation)):
            pred = model.predict(frame[cols])
            scores[name][split] = metrics(frame.loyer, pred)
            predictions[name][split] = pred.tolist()

    # 3. Choisir avec la validation ; évaluer ce choix UNE FOIS sur le test final.
    chosen = min(candidates, key=lambda name: scores[name]["validation"]["mae"])
    best, cols = candidates[chosen]
    final_pred = best.predict(test[cols])
    final_score = metrics(test.loyer, final_pred)

    # 4. Examiner les erreurs, sans supprimer une annonce parce qu'elle gêne le score.
    audit = validation.assign(predit=predictions["numeric"]["validation"])
    audit["residu"] = audit.loyer - audit.predit
    audit["erreur_absolue"] = audit.residu.abs()

    # 5. Vérifier que changer les unités ne change pas les prédictions OLS.
    scaled = make_model(scale=True).fit(train[FEATURES], train.loyer)
    np.testing.assert_allclose(scaled.predict(validation[FEATURES]), with_age.predict(validation[FEATURES]), atol=1e-10)
    output = {"description": data["description"], "columns": data["columns"],
              "train": data["train"], "validation": data["validation"], "test": data["test"],
              "coef": {"numeric": numeric.coef_.tolist(), "intercept": float(numeric.intercept_),
                       "age": with_age.named_steps["linearregression"].coef_.tolist(),
                       "age_intercept": float(with_age.named_steps["linearregression"].intercept_),
                       "scaled": scaled.named_steps["linearregression"].coef_.tolist()},
              "feature_names": FEATURES, "scores": scores, "predictions": predictions,
              "audit": audit.sort_values("erreur_absolue", ascending=False).to_dict(orient="records"),
              "chosen": chosen, "final": {"scores": final_score, "predictions": final_pred.tolist()}}
    print("COEFFICIENTS (surface, distance)", np.round(numeric.coef_, 6), "constante", round(numeric.intercept_, 6))
    print("VALIDATION — mêmes 6 annonces ; unités : milliers de MRU")
    for name in candidates:
        print(name, {k: round(v, 4) for k, v in scores[name]["validation"].items()})
    print("RÉSIDUS ET ÂGE (validation)", audit[["age", "residu"]].round(2).values.tolist())
    print("CHOIX", chosen, "TEST FINAL", {k: round(v, 4) for k, v in final_score.items()})
    return output


def figures(out, directory):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    directory.mkdir(parents=True, exist_ok=True)
    y = np.array([row[3] for row in out["validation"]])
    limit = np.ceil(max(np.abs(y - np.array(out["predictions"][name]["validation"])).max()
                        for name in ["numeric", "age"]))
    fig, axes = plt.subplots(1, 2, figsize=(10, 4), sharex=True, sharey=True)
    for ax, name, title in zip(axes, ["numeric", "age"], ["Surface + distance", "+ âge du logement"]):
        pred = np.array(out["predictions"][name]["validation"])
        ax.scatter(pred, y - pred, s=55, color="#7b1e2e", edgecolor="white", zorder=3)
        ax.axhline(0, color="#858b96", lw=1, ls="--")
        ax.set(title=title, xlabel="Loyer prédit (milliers de MRU)", ylim=(-limit, limit))
        ax.grid(axis="y", color="#ebedf0"); ax.set_axisbelow(True)
        ax.spines[["top", "right"]].set_visible(False)
    axes[0].set_ylabel("Résidu réel − prédit (milliers de MRU)")
    fig.suptitle("Même validation, même échelle — données fictives")
    fig.tight_layout(); fig.savefig(directory / "residus-validation.png", dpi=160); plt.close(fig)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path(__file__).with_name("cm02-loyers.json"))
    parser.add_argument("--export-js", type=Path, help="Usage préparation du cours : sorties vérifiées pour le site")
    parser.add_argument("--figures", type=Path)
    args = parser.parse_args()
    out = run(args.data)
    if args.export_js:
        args.export_js.write_text("/* Sorties de examples/cm02-regression.py ; données fictives. */\nwindow.CM02Example = " + json.dumps(out, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    if args.figures:
        figures(out, args.figures)
