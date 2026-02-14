/**
 * AudioSystem - Handles 3D positional audio using Web Audio API
 * Manages ambient sounds, one-shot effects, and spatial audio
 */

import * as THREE from 'three';
import { AssetManager } from '../core/AssetManager';

export interface SoundOptions {
  volume?: number;
  loop?: boolean;
  position?: THREE.Vector3;
  maxDistance?: number;
  rolloffFactor?: number;
}

interface ActiveSound {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  pannerNode?: PannerNode;
  startTime: number;
  duration: number;
  loop: boolean;
}

export class AudioSystem {
  private assetManager: AssetManager;
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private activeSounds: Map<string, ActiveSound> = new Map();
  private soundIdCounter: number = 0;
  private maxSounds: number = 20;

  // Volume settings
  private masterVolume: number = 1.0;
  private effectsVolume: number = 0.8;
  private ambientVolume: number = 0.5;

  constructor(assetManager: AssetManager) {
    this.assetManager = assetManager;
    this.audioContext = assetManager.getAudioContext();

    // Create master gain node
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = this.masterVolume;
    this.masterGain.connect(this.audioContext.destination);
  }

  /**
   * Resume audio context (required after user interaction)
   */
  public async resume(): Promise<void> {
    await this.assetManager.resumeAudioContext();
  }

  /**
   * Update listener position to match camera
   */
  public updateListenerPosition(camera: THREE.Camera): void {
    // Update Web Audio API listener position
    const position = camera.position;
    const listener = this.audioContext.listener;

    if (listener.positionX) {
      // Modern API
      listener.positionX.value = position.x;
      listener.positionY.value = position.y;
      listener.positionZ.value = position.z;

      // Update orientation
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0);
      up.applyQuaternion(camera.quaternion);

      listener.forwardX.value = forward.x;
      listener.forwardY.value = forward.y;
      listener.forwardZ.value = forward.z;
      listener.upX.value = up.x;
      listener.upY.value = up.y;
      listener.upZ.value = up.z;
    } else {
      // Fallback for older browsers
      listener.setPosition(position.x, position.y, position.z);
    }
  }

  /**
   * Play a sound effect
   */
  public playSound(
    soundName: string,
    options: SoundOptions = {}
  ): string | null {
    // Check if we've reached max sounds
    if (this.activeSounds.size >= this.maxSounds) {
      this.cleanupFinishedSounds();
      if (this.activeSounds.size >= this.maxSounds) {
        console.warn('Max sounds reached, skipping:', soundName);
        return null;
      }
    }

    // Get audio buffer
    const buffer = this.assetManager.getAudioBuffer(soundName);
    if (!buffer) {
      console.warn(`Audio buffer not found: ${soundName}`);
      return null;
    }

    // Create source node
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = options.loop || false;

    // Create gain node for volume control
    const gainNode = this.audioContext.createGain();
    const volume = options.volume !== undefined ? options.volume : 1.0;
    const typeVolume = options.loop ? this.ambientVolume : this.effectsVolume;
    gainNode.gain.value = volume * typeVolume;

    // Connect nodes
    let finalNode: AudioNode = gainNode;

    // Add 3D positioning if position provided
    let pannerNode: PannerNode | undefined;
    if (options.position) {
      pannerNode = this.audioContext.createPanner();
      pannerNode.panningModel = 'HRTF';
      pannerNode.distanceModel = 'inverse';
      pannerNode.refDistance = 1;
      pannerNode.maxDistance = options.maxDistance || 50;
      pannerNode.rolloffFactor = options.rolloffFactor || 1;

      pannerNode.setPosition(
        options.position.x,
        options.position.y,
        options.position.z
      );

      gainNode.connect(pannerNode);
      finalNode = pannerNode;
    }

    // Connect to master gain
    finalNode.connect(this.masterGain);

    // Start playing
    source.start(0);

    // Generate unique ID for this sound
    const soundId = `sound_${this.soundIdCounter++}`;

    // Track active sound
    this.activeSounds.set(soundId, {
      source,
      gainNode,
      pannerNode,
      startTime: this.audioContext.currentTime,
      duration: buffer.duration,
      loop: source.loop,
    });

    // Clean up when finished (if not looping)
    if (!source.loop) {
      source.onended = () => {
        this.stopSound(soundId);
      };
    }

    return soundId;
  }

  /**
   * Play ambient sound (automatically loops)
   */
  public playAmbient(soundName: string, volume: number = 0.5): string | null {
    return this.playSound(soundName, { loop: true, volume });
  }

  /**
   * Play 3D positional sound
   */
  public playSound3D(
    soundName: string,
    position: THREE.Vector3,
    volume: number = 1.0,
    maxDistance: number = 50
  ): string | null {
    return this.playSound(soundName, {
      position,
      volume,
      maxDistance,
    });
  }

  /**
   * Stop a specific sound
   */
  public stopSound(soundId: string): void {
    const sound = this.activeSounds.get(soundId);
    if (sound) {
      try {
        sound.source.stop();
        sound.source.disconnect();
        sound.gainNode.disconnect();
        if (sound.pannerNode) {
          sound.pannerNode.disconnect();
        }
      } catch (e) {
        // Already stopped or disconnected
      }
      this.activeSounds.delete(soundId);
    }
  }

  /**
   * Stop all sounds
   */
  public stopAllSounds(): void {
    const soundIds = Array.from(this.activeSounds.keys());
    soundIds.forEach((id) => this.stopSound(id));
  }

  /**
   * Update 3D sound position
   */
  public updateSoundPosition(soundId: string, position: THREE.Vector3): void {
    const sound = this.activeSounds.get(soundId);
    if (sound && sound.pannerNode) {
      sound.pannerNode.setPosition(position.x, position.y, position.z);
    }
  }

  /**
   * Set master volume (0-1)
   */
  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.masterGain.gain.value = this.masterVolume;
  }

  /**
   * Set effects volume (0-1)
   */
  public setEffectsVolume(volume: number): void {
    this.effectsVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Set ambient volume (0-1)
   */
  public setAmbientVolume(volume: number): void {
    this.ambientVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get master volume
   */
  public getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Clean up finished sounds
   */
  private cleanupFinishedSounds(): void {
    const currentTime = this.audioContext.currentTime;
    const soundsToRemove: string[] = [];

    this.activeSounds.forEach((sound, id) => {
      if (!sound.loop && currentTime > sound.startTime + sound.duration) {
        soundsToRemove.push(id);
      }
    });

    soundsToRemove.forEach((id) => this.stopSound(id));
  }

  /**
   * Update audio system (call each frame)
   */
  public update(_delta: number): void {
    // Clean up finished sounds periodically
    if (Math.random() < 0.1) {
      // 10% chance per frame
      this.cleanupFinishedSounds();
    }
  }

  /**
   * Dispose of audio system
   */
  public dispose(): void {
    this.stopAllSounds();
    this.masterGain.disconnect();
  }
}
