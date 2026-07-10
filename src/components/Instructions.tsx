/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BookOpen, HelpCircle, X, Info } from "lucide-react";
import { TRANSLATIONS, ORB_TIERS } from "../types";

interface InstructionsProps {
  language: "en" | "hi";
  onClose?: () => void;
  showCloseButton?: boolean;
}

export default function Instructions({
  language,
  onClose,
  showCloseButton = false,
}: InstructionsProps) {
  const t = TRANSLATIONS[language];

  return (
    <div id="instructions-container" className="w-full bg-[#11131a] border border-[#232736] rounded-2xl p-4 shadow-xl relative overflow-hidden">
      {/* Absolute background accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
        <h3 id="instructions-title" className="text-sm font-bold tracking-wider uppercase text-indigo-400 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          {t.howToPlay}
        </h3>
        {showCloseButton && onClose && (
          <button
            id="close-instructions-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-3 mb-5 text-gray-300 text-xs leading-relaxed">
        <div className="flex gap-2 items-start">
          <span className="w-5 h-5 bg-indigo-500/15 rounded-full flex items-center justify-center font-bold text-indigo-400 shrink-0">1</span>
          <p id="tut-step-1">{t.howToPlay1}</p>
        </div>
        <div className="flex gap-2 items-start">
          <span className="w-5 h-5 bg-indigo-500/15 rounded-full flex items-center justify-center font-bold text-indigo-400 shrink-0">2</span>
          <p id="tut-step-2">{t.howToPlay2}</p>
        </div>
        <div className="flex gap-2 items-start">
          <span className="w-5 h-5 bg-indigo-500/15 rounded-full flex items-center justify-center font-bold text-indigo-400 shrink-0">3</span>
          <p id="tut-step-3">{t.howToPlay3}</p>
        </div>
        <div className="flex gap-2 items-start">
          <span className="w-5 h-5 bg-red-500/15 rounded-full flex items-center justify-center font-bold text-red-400 shrink-0">!</span>
          <p id="tut-step-4" className="text-red-300 font-semibold">{t.howToPlay4}</p>
        </div>
      </div>

      <h4 id="evolution-line-title" className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-2 flex items-center gap-1">
        <Info className="w-3 h-3" />
        {language === "en" ? "ORB EVOLUTION PATH" : "ऑर्ब विकास मार्ग"}
      </h4>

      {/* Grid of tiers with colors */}
      <div id="orb-tiers-grid" className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1 select-none">
        {ORB_TIERS.map((tier) => (
          <div
            id={`tier-card-${tier.id}`}
            key={tier.id}
            className="flex flex-col items-center p-1.5 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all text-center relative group"
            style={{
              boxShadow: `inset 0 0 4px ${tier.color}0a`,
            }}
          >
            <div
              id={`tier-visual-${tier.id}`}
              className="w-5 h-5 rounded-full mb-1 flex items-center justify-center font-bold text-[8px] text-black relative"
              style={{
                backgroundColor: tier.color,
                boxShadow: `0 0 8px ${tier.color}`,
              }}
            >
              <div className="absolute inset-0.5 rounded-full bg-white/20"></div>
            </div>
            <span id={`tier-name-${tier.id}`} className="text-[10px] font-semibold text-gray-300 truncate w-full">
              {language === "en" ? tier.nameEn : tier.nameHi}
            </span>
            <span id={`tier-score-${tier.id}`} className="text-[8px] font-mono font-bold text-gray-500">
              +{tier.scoreValue}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
