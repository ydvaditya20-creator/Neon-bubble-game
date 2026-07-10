/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Award, CheckCircle, Lock } from "lucide-react";
import { Achievement, TRANSLATIONS } from "../types";

interface AchievementsPanelProps {
  achievements: Achievement[];
  language: "en" | "hi";
}

export default function AchievementsPanel({ achievements, language }: AchievementsPanelProps) {
  const t = TRANSLATIONS[language];

  return (
    <div id="achievements-root" className="w-full bg-[#11131a] border border-[#232736] rounded-2xl p-4 shadow-xl">
      <h3 id="achievements-title" className="text-lg font-bold font-sans tracking-tight text-white flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-indigo-400" />
        {t.achievements}
      </h3>

      <div className="space-y-3">
        {achievements.map((ach) => (
          <div
            id={`ach-row-${ach.id}`}
            key={ach.id}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
              ach.unlocked
                ? "bg-indigo-500/5 border-indigo-500/20"
                : "bg-slate-900/10 border-slate-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                id={`ach-icon-${ach.id}`}
                className={`text-xl p-1.5 rounded-lg flex items-center justify-center shrink-0 select-none ${
                  ach.unlocked ? "bg-indigo-500/10" : "bg-slate-800/50 grayscale"
                }`}
              >
                {ach.icon}
              </span>
              <div>
                <div
                  id={`ach-title-${ach.id}`}
                  className={`text-xs font-bold ${ach.unlocked ? "text-indigo-200" : "text-gray-400"}`}
                >
                  {language === "en" ? ach.titleEn : ach.titleHi}
                </div>
                <div
                  id={`ach-desc-${ach.id}`}
                  className="text-[10px] text-gray-500 mt-0.5"
                >
                  {language === "en" ? ach.descEn : ach.descHi}
                </div>
              </div>
            </div>

            <div>
              {ach.unlocked ? (
                <div id={`ach-badge-unlocked-${ach.id}`} className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                  <CheckCircle className="w-3 h-3" />
                  {t.unlocked}
                </div>
              ) : (
                <div id={`ach-badge-locked-${ach.id}`} className="flex items-center gap-1 text-[10px] text-gray-500 bg-slate-800 px-2 py-0.5 rounded-full font-semibold">
                  <Lock className="w-2.5 h-2.5" />
                  {t.locked}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
