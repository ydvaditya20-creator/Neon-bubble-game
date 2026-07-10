/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Trophy, Star, Clock, Trash2, Check, User } from "lucide-react";
import { HighScore, TRANSLATIONS, ORB_TIERS } from "../types";

interface LeaderboardProps {
  currentScore: number;
  maxOrbReached: number;
  language: "en" | "hi";
  onScoreSaved: () => void;
  gameActive: boolean;
}

export default function Leaderboard({
  currentScore,
  maxOrbReached,
  language,
  onScoreSaved,
  gameActive,
}: LeaderboardProps) {
  const [scores, setScores] = useState<HighScore[]>([]);
  const [name, setName] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const t = TRANSLATIONS[language];

  useEffect(() => {
    loadScores();
  }, []);

  const loadScores = () => {
    try {
      const stored = localStorage.getItem("neon_merge_scores");
      if (stored) {
        const parsed = JSON.parse(stored) as HighScore[];
        // Sort descending
        parsed.sort((a, b) => b.score - a.score);
        setScores(parsed.slice(0, 5));
      } else {
        // Seed default scores
        const defaults: HighScore[] = [
          { name: "Vega Pro", score: 1800, date: "2026-06-15", maxOrbReached: 7 },
          { name: "Nebula Runner", score: 1200, date: "2026-07-01", maxOrbReached: 6 },
          { name: "Star Dust", score: 650, date: "2026-07-09", maxOrbReached: 5 },
        ];
        localStorage.setItem("neon_merge_scores", JSON.stringify(defaults));
        setScores(defaults);
      }
    } catch (e) {
      console.error("Failed to load scores", e);
    }
  };

  const handleSaveScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const stored = localStorage.getItem("neon_merge_scores");
      let currentScores: HighScore[] = [];
      if (stored) {
        currentScores = JSON.parse(stored) as HighScore[];
      }

      const newEntry: HighScore = {
        name: name.substring(0, 16),
        score: currentScore,
        date: new Date().toISOString().split("T")[0],
        maxOrbReached: maxOrbReached,
      };

      currentScores.push(newEntry);
      currentScores.sort((a, b) => b.score - a.score);
      // Keep top 10 in storage, but only show top 5 in UI
      const trimmedScores = currentScores.slice(0, 10);
      localStorage.setItem("neon_merge_scores", JSON.stringify(trimmedScores));

      setScores(trimmedScores.slice(0, 5));
      setIsSaved(true);
      onScoreSaved();
    } catch (e) {
      console.error("Failed to save score", e);
    }
  };

  const handleClearScores = () => {
    if (window.confirm(language === "en" ? "Clear all scores?" : "सभी स्कोर हटाएं?")) {
      localStorage.removeItem("neon_merge_scores");
      setScores([]);
    }
  };

  return (
    <div id="leaderboard-root" className="w-full bg-[#11131a] border border-[#232736] rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 id="leaderboard-title" className="text-lg font-bold font-sans tracking-tight text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          {t.leaderboard}
        </h3>
        {scores.length > 0 && (
          <button
            id="clear-leaderboard-btn"
            onClick={handleClearScores}
            className="text-gray-500 hover:text-red-400 transition-colors duration-200 p-1 rounded-lg hover:bg-red-500/10"
            title={t.clear}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Save score form if game ended and score > 0 */}
      {!gameActive && currentScore > 0 && !isSaved && (
        <form onSubmit={handleSaveScore} className="mb-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
          <p className="text-yellow-400 text-xs font-semibold mb-2 flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            {language === "en" ? "New Highscore Achieved!" : "नया हाई-स्कोर प्राप्त किया!"}
          </p>
          <div className="text-white font-mono text-xl font-bold mb-3">
            {t.score}: {currentScore}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="leaderboard-name-input"
                type="text"
                placeholder={t.enterName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={16}
                required
                className="w-full bg-[#181a24] text-white text-sm pl-9 pr-3 py-2 rounded-lg border border-[#2d3246] focus:border-yellow-500 focus:outline-none transition-colors"
              />
            </div>
            <button
              id="save-score-submit"
              type="submit"
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition-all shadow-md active:scale-95 flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              {t.saveScore}
            </button>
          </div>
        </form>
      )}

      {isSaved && (
        <div id="saved-score-notice" className="mb-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 text-emerald-400 text-sm font-semibold flex items-center gap-2">
          <Check className="w-5 h-5" />
          {t.scoreSaved}
        </div>
      )}

      {/* Scores List */}
      <div className="space-y-2">
        {scores.length === 0 ? (
          <div id="no-scores-notice" className="text-center text-xs text-gray-500 py-6 font-mono">
            {language === "en" ? "No space flights logged yet" : "अभी तक कोई स्पेस फ्लाइट लॉग नहीं हुई है"}
          </div>
        ) : (
          scores.map((score, idx) => {
            const maxOrb = ORB_TIERS[Math.min(score.maxOrbReached, ORB_TIERS.length - 1)];
            const isTop1 = idx === 0;

            return (
              <div
                id={`leaderboard-row-${idx}`}
                key={idx}
                className={`flex items-center justify-between p-2.5 rounded-xl transition-all duration-300 ${
                  isTop1
                    ? "bg-gradient-to-r from-yellow-500/10 to-transparent border-l-2 border-yellow-500 bg-slate-900/40"
                    : "bg-slate-900/20 hover:bg-slate-900/40 border-l-2 border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    id={`leaderboard-rank-${idx}`}
                    className={`font-mono text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                      isTop1
                        ? "bg-yellow-500 text-slate-950"
                        : "bg-slate-800 text-gray-400"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <div id={`leaderboard-name-${idx}`} className="text-xs font-bold text-gray-200">{score.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        id={`leaderboard-tier-${idx}`}
                        className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold border"
                        style={{
                          backgroundColor: `${maxOrb.color}15`,
                          color: maxOrb.color,
                          borderColor: `${maxOrb.color}35`,
                        }}
                      >
                        {language === "en" ? maxOrb.nameEn : maxOrb.nameHi}
                      </span>
                      <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {score.date}
                      </span>
                    </div>
                  </div>
                </div>
                <div id={`leaderboard-score-${idx}`} className="font-mono text-sm font-extrabold text-white tracking-wider">
                  {score.score}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
