/**
 * AssetManager - Handles loading and caching of game assets (audio, textures, models)
 * Uses Web Audio API for audio loading
 */

export interface LoadProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentFile: string;
}

export type ProgressCallback = (progress: LoadProgress) => void;

export class AssetManager {
  private audioContext: AudioContext;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private loadedAssets: Set<string> = new Set();
  private loadingPromises: Map<string, Promise<AudioBuffer>> = new Map();

  constructor() {
    // Create AudioContext (will be resumed on first user interaction)
    this.audioContext = new AudioContext();
  }

  /**
   * Get the audio context (for use by AudioSystem)
   */
  public getAudioContext(): AudioContext {
    return this.audioContext;
  }

  /**
   * Resume audio context (required after user interaction due to browser autoplay policies)
   */
  public async resumeAudioContext(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Load a single audio file
   */
  public async loadAudio(path: string, name: string): Promise<AudioBuffer> {
    // Return cached buffer if already loaded
    if (this.audioBuffers.has(name)) {
      return this.audioBuffers.get(name)!;
    }

    // Return existing promise if currently loading
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name)!;
    }

    // Create new loading promise
    const loadPromise = this._loadAudioFile(path, name);
    this.loadingPromises.set(name, loadPromise);

    try {
      const buffer = await loadPromise;
      this.audioBuffers.set(name, buffer);
      this.loadedAssets.add(name);
      this.loadingPromises.delete(name);
      return buffer;
    } catch (error) {
      this.loadingPromises.delete(name);
      console.warn(`Failed to load audio: ${path}`, error);
      throw error;
    }
  }

  /**
   * Internal method to load audio file
   */
  private async _loadAudioFile(path: string, _name: string): Promise<AudioBuffer> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
  }

  /**
   * Load multiple audio files with progress tracking
   */
  public async loadAudioBatch(
    files: Array<{ path: string; name: string }>,
    onProgress?: ProgressCallback
  ): Promise<void> {
    const total = files.length;
    let loaded = 0;

    const loadPromises = files.map(async (file) => {
      try {
        await this.loadAudio(file.path, file.name);
        loaded++;
        if (onProgress) {
          onProgress({
            loaded,
            total,
            percentage: (loaded / total) * 100,
            currentFile: file.name,
          });
        }
      } catch (_error) {
        console.warn(`Failed to load ${file.name}, continuing...`);
        loaded++;
        if (onProgress) {
          onProgress({
            loaded,
            total,
            percentage: (loaded / total) * 100,
            currentFile: file.name,
          });
        }
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Get a loaded audio buffer
   */
  public getAudioBuffer(name: string): AudioBuffer | null {
    return this.audioBuffers.get(name) || null;
  }

  /**
   * Check if an asset is loaded
   */
  public isLoaded(name: string): boolean {
    return this.loadedAssets.has(name);
  }

  /**
   * Get loading progress
   */
  public getLoadProgress(): { loaded: number; total: number } {
    return {
      loaded: this.loadedAssets.size,
      total: this.audioBuffers.size + this.loadingPromises.size,
    };
  }

  /**
   * Dispose of all assets and clean up
   */
  public dispose(): void {
    this.audioBuffers.clear();
    this.loadedAssets.clear();
    this.loadingPromises.clear();
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
