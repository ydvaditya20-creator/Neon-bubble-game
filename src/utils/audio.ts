/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Lazy initialization on first user interaction
  }

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    this.init();
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Soft high-frequency pluck for dropping
  public playDrop() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch (e) {
      console.warn("Audio drop failed", e);
    }
  }

  // Soft low-passed thud for collisions
  public playBounce(velocity: number) {
    this.init();
    if (this.isMuted || !this.ctx) return;

    try {
      // Scale volume with collision velocity
      const volume = Math.min(0.4, Math.max(0.01, velocity * 0.015));
      if (volume < 0.01) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(80, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(45, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch (e) {
      console.warn("Audio bounce failed", e);
    }
  }

  // Divine bells with progressive pitch scaling + punchy arcade blast
  public playMerge(tierIndex: number) {
    this.init();
    if (this.isMuted || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Pentatonic scale based on tier for harmonic synergy
      const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
      const baseFreq = scale[tierIndex % scale.length];

      // 1. Harmonics chime
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.25);

      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(baseFreq * 2.01, now);

      gain2.gain.setValueAtTime(0.4, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);

      // 2. Deep Sub Bass Thump (grows louder and lower with higher tiers)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      const subFreq = Math.max(45, 120 - tierIndex * 7); // deeper bass for larger orbs

      subOsc.type = "triangle";
      subOsc.frequency.setValueAtTime(subFreq, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.22);

      const maxSubGain = Math.min(0.8, 0.15 + tierIndex * 0.04);
      subGain.gain.setValueAtTime(maxSubGain, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);

      subOsc.start();
      subOsc.stop(now + 0.3);

      // 3. Dynamic White Noise Puff for "Pop/Blast" crunch effect
      const bufferSize = this.ctx.sampleRate * 0.15; // 0.15 seconds buffer
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const filterNode = this.ctx.createBiquadFilter();
      filterNode.type = "bandpass";
      // Filter frequency gets higher or lower depending on tiers
      filterNode.frequency.setValueAtTime(500 + tierIndex * 120, now);
      filterNode.Q.setValueAtTime(1.8, now);

      const noiseGain = this.ctx.createGain();
      const maxNoiseGain = Math.min(0.6, 0.08 + tierIndex * 0.025);
      noiseGain.gain.setValueAtTime(maxNoiseGain, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      noiseNode.connect(filterNode);
      filterNode.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noiseNode.start();
    } catch (e) {
      console.warn("Audio merge failed", e);
    }
  }

  // High pitch combo sound
  public playCombo(comboCount: number) {
    this.init();
    if (this.isMuted || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const baseFreq = 440 * Math.pow(1.12, comboCount); // Scale up in pitch

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, now);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn("Audio combo failed", e);
    }
  }

  // Fast arpeggiated sweep for achievements
  public playAchievement() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // Major chord arpeggio
      const noteDuration = 0.08;

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * noteDuration);

        gain.gain.setValueAtTime(0.8, now + idx * noteDuration);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * noteDuration + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * noteDuration);
        osc.stop(now + idx * noteDuration + 0.25);
      });
    } catch (e) {
      console.warn("Audio achievement failed", e);
    }
  }

  // Dramatic descending sweep + low hum
  public playGameOver() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 1.2);

      // Low pass filter to make it sound muffled and deep
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 1.2);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(now + 1.4);
    } catch (e) {
      console.warn("Audio gameover failed", e);
    }
  }
}

export const gameAudio = new AudioSynthesizer();
