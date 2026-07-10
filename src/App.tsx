/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Gamepad2, Sparkles, Languages, HelpCircle, Trophy, Award, RotateCcw, Volume2, VolumeX } from "lucide-react";
import GameCanvas from "./components/GameCanvas";
import Leaderboard from "./components/Leaderboard";
import AchievementsPanel from "./components/AchievementsPanel";
import Instructions from "./components/Instructions";
import { TRANSLATIONS, INITIAL_ACHIEVEMENTS, Achievement, ORB_TIERS } from "./types";
import { gameAudio } from "./utils/audio";

export default function App() {
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [maxOrbReached, setMaxOrbReached] = useState(0);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [activeTab, setActiveTab] = useState<"scores" | "achievements" | "rules">("scores");

  // Achievement unlock banner state
  const [unlockedBanner, setUnlockedBanner] = useState<Achievement | null>(null);

  const t = TRANSLATIONS[language];

  // Load Highscore and Achievements on mount
  useEffect(() => {
    // 1. Load Local High Score
    try {
      const storedScores = localStorage.getItem("neon_merge_scores");
      if (storedScores) {
        const parsed = JSON.parse(storedScores);
        if (parsed.length > 0) {
          setHighScore(parsed[0].score);
        }
      } else {
        setHighScore(1800); // Vega Pro initial highscore
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Load Achievements progress
    try {
      const storedAch = localStorage.getItem("neon_merge_achievements");
      if (storedAch) {
        const parsed = JSON.parse(storedAch) as Achievement[];
        // Align keys with initial configuration in case of scheme changes
        const merged = INITIAL_ACHIEVEMENTS.map((initial) => {
          const found = parsed.find((item) => item.id === initial.id);
          return found ? { ...initial, unlocked: found.unlocked } : initial;
        });
        setAchievements(merged);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Update overall highscore when score increases
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
    }
  }, [score, highScore]);

  const handleScoreChange = (newScore: number) => {
    setScore(newScore);
  };

  const handleMaxOrbUpdate = (maxOrbLvl: number) => {
    setMaxOrbReached(maxOrbLvl);
  };

  const handleRestart = () => {
    setScore(0);
    setResetKey((prev) => prev + 1);
    setGameState("playing");
  };

  const handleScoreSaved = () => {
    // Reload high score from leaderboard records
    try {
      const stored = localStorage.getItem("neon_merge_scores");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.length > 0) {
          setHighScore(parsed[0].score);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger Achievement Unlocking
  const triggerAchievementUnlock = (id: string) => {
    setAchievements((prev) => {
      const updated = prev.map((ach) => {
        if (ach.id === id && !ach.unlocked) {
          // Play reward arpeggio
          gameAudio.playAchievement();

          // Save state to local storage
          const nextState = { ...ach, unlocked: true };
          setTimeout(() => {
            // Show alert banner
            setUnlockedBanner(nextState);
            // Hide banner after 3.5 seconds
            setTimeout(() => {
              setUnlockedBanner(null);
            }, 3500);
          }, 100);

          return nextState;
        }
        return ach;
      });

      localStorage.setItem("neon_merge_achievements", JSON.stringify(updated));
      return updated;
    });
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "hi" : "en"));
  };

  const currentMaxOrb = ORB_TIERS[Math.min(maxOrbReached, ORB_TIERS.length - 1)];

  return (
    <div className="min-h-screen bg-[#07080c] text-white flex flex-col justify-between overflow-x-hidden relative">
      {/* Background Ambient Cosmic Blur Shapes */}
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Floating Achievement Banner Alert */}
      {unlockedBanner && (
        <div id="achievement-banner-alert" className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-yellow-500/30 rounded-2xl p-4 shadow-2xl flex items-center gap-3.5 animate-bounce">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-xl shrink-0 select-none">
            {unlockedBanner.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-extrabold tracking-widest text-yellow-400 uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {language === "en" ? "ACHIEVEMENT UNLOCKED!" : "उपलब्धि अनलॉक हुई!"}
            </div>
            <div className="text-xs font-bold text-white truncate mt-0.5">
              {language === "en" ? unlockedBanner.titleEn : unlockedBanner.titleHi}
            </div>
            <div className="text-[10px] text-gray-400 truncate mt-0.5">
              {language === "en" ? unlockedBanner.descEn : unlockedBanner.descHi}
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation / Header */}
      <header className="border-b border-[#181b28]/60 bg-[#0c0e15]/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 id="header-game-title" className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent leading-none">
                {t.title}
              </h1>
              <p className="text-[10px] font-mono text-indigo-400 font-semibold tracking-wider mt-0.5">
                {t.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <button
              id="lang-toggle-btn"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#11131a] hover:bg-[#1b1e2b] border border-[#232736] text-xs font-medium text-gray-300 transition-all duration-300 active:scale-95"
            >
              <Languages className="w-3.5 h-3.5 text-indigo-400" />
              <span>{language === "en" ? "हिन्दी" : "English"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Game Stage Layout Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start px-4 py-6">
        
        {/* LEFT COLUMN: THE ARCADE CONSOLE PLAYABLE */}
        <section className="lg:col-span-5 flex flex-col items-center">
          
          {/* Real-time score boards during active play */}
          <div className="w-full max-w-[380px] grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#11131a] border border-[#232736] rounded-2xl p-3.5 text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-transparent"></div>
              <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">{t.score}</span>
              <div id="game-live-score" className="text-2xl font-mono font-extrabold text-white mt-1 tracking-wider">
                {score}
              </div>
            </div>

            <div className="bg-[#11131a] border border-[#232736] rounded-2xl p-3.5 text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-transparent"></div>
              <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">{t.highScore}</span>
              <div id="game-live-highscore" className="text-2xl font-mono font-extrabold text-yellow-400 mt-1 tracking-wider">
                {highScore}
              </div>
            </div>
          </div>

          <GameCanvas
            score={score}
            onScoreChange={handleScoreChange}
            onMaxOrbUpdate={handleMaxOrbUpdate}
            onAchievementUnlock={triggerAchievementUnlock}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            language={language}
            gameState={gameState}
            setGameState={setGameState}
            onRestart={handleRestart}
            resetKey={resetKey}
          />
        </section>

        {/* RIGHT COLUMN: INTERACTIVE HUD / TABS COCKPIT */}
        <section className="lg:col-span-7 flex flex-col gap-6 w-full">
          {/* Quick Tab Selector for Leaderboard, Achievements, Instructions */}
          <div className="flex bg-[#11131a] border border-[#232736] p-1 rounded-2xl w-full">
            <button
              id="tab-btn-scores"
              onClick={() => setActiveTab("scores")}
              className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                activeTab === "scores"
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/10"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{language === "en" ? "Leaderboard" : "लीडरबोर्ड"}</span>
            </button>
            <button
              id="tab-btn-achievements"
              onClick={() => setActiveTab("achievements")}
              className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                activeTab === "achievements"
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/10"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{language === "en" ? "Achievements" : "उपलब्धियां"}</span>
            </button>
            <button
              id="tab-btn-rules"
              onClick={() => setActiveTab("rules")}
              className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
                activeTab === "rules"
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/10"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{language === "en" ? "How to Play" : "कैसे खेलें"}</span>
            </button>
          </div>

          {/* Active Tab View Rendering */}
          <div className="transition-all duration-300">
            {activeTab === "scores" && (
              <div className="space-y-4">
                {/* Real-time Max Orb Status Indicator card */}
                {gameState === "playing" && maxOrbReached > 0 && (
                  <div id="max-orb-banner" className="flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-[#11131a] border border-[#232736] p-4 rounded-2xl shadow-md">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-black text-xs relative"
                        style={{
                          backgroundColor: currentMaxOrb.color,
                          boxShadow: `0 0 14px ${currentMaxOrb.color}`,
                        }}
                      >
                        <div className="absolute inset-0.5 rounded-full bg-white/20"></div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          {language === "en" ? "HIGHEST COSMIC ORB REACHED" : "प्राप्त किया गया उच्चतम ऑर्ब"}
                        </div>
                        <div id="max-orb-name" className="text-sm font-extrabold text-white mt-0.5">
                          {language === "en" ? currentMaxOrb.nameEn : currentMaxOrb.nameHi}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                        Tier {maxOrbReached + 1}
                      </span>
                    </div>
                  </div>
                )}
                <Leaderboard
                  currentScore={score}
                  maxOrbReached={maxOrbReached}
                  language={language}
                  onScoreSaved={handleScoreSaved}
                  gameActive={gameState === "playing"}
                />
              </div>
            )}

            {activeTab === "achievements" && (
              <AchievementsPanel achievements={achievements} language={language} />
            )}

            {activeTab === "rules" && (
              <Instructions language={language} />
            )}
          </div>
        </section>
      </main>

      {/* Footer Branding credits */}
      <footer className="border-t border-[#181b28]/30 py-4 text-center text-gray-600 font-mono text-[10px] px-4">
        <p>{t.credits}</p>
        <p className="mt-1 opacity-75">© 2026 Cosmic Games Studio • Neon Merge</p>
      </footer>
    </div>
  );
}
