/**
 * TimeSystem - Manages day/night cycle and dynamic lighting
 * Full cycle completes in 10 minutes real time (600 seconds)
 */

import * as THREE from 'three';

export enum TimeOfDay {
  DAWN = 'dawn',
  DAY = 'day',
  DUSK = 'dusk',
  NIGHT = 'night',
}

export class TimeSystem {
  private currentTime: number = 0; // 0-1 represents full day cycle
  private cycleSpeed: number = 1 / 600; // Complete cycle in 600 seconds
  private directionalLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private scene: THREE.Scene;
  private fog: THREE.Fog;

  // Color presets for different times of day
  private readonly timeColors = {
    dawn: {
      sun: new THREE.Color(0xffa500), // Orange
      ambient: new THREE.Color(0x4a4a6a), // Dark blue-gray
      fog: new THREE.Color(0xffa500),
      sunIntensity: 0.6,
      ambientIntensity: 0.3,
    },
    day: {
      sun: new THREE.Color(0xffffff), // White
      ambient: new THREE.Color(0x8888aa), // Light blue-gray
      fog: new THREE.Color(0xccddff),
      sunIntensity: 1.0,
      ambientIntensity: 0.5,
    },
    dusk: {
      sun: new THREE.Color(0xff6600), // Deep orange
      ambient: new THREE.Color(0x3a3a5a), // Darker blue-gray
      fog: new THREE.Color(0xff8844),
      sunIntensity: 0.5,
      ambientIntensity: 0.25,
    },
    night: {
      sun: new THREE.Color(0x4466aa), // Blue moonlight
      ambient: new THREE.Color(0x1a1a2a), // Very dark blue
      fog: new THREE.Color(0x1a1a3a),
      sunIntensity: 0.2,
      ambientIntensity: 0.1,
    },
  };

  constructor(
    scene: THREE.Scene,
    directionalLight: THREE.DirectionalLight,
    ambientLight: THREE.AmbientLight
  ) {
    this.scene = scene;
    this.directionalLight = directionalLight;
    this.ambientLight = ambientLight;

    // Get fog reference from scene
    if (scene.fog && scene.fog instanceof THREE.Fog) {
      this.fog = scene.fog;
    } else {
      // Create fog if it doesn't exist
      this.fog = new THREE.Fog(0xccddff, 50, 200);
      scene.fog = this.fog;
    }

    // Start at dawn (0.1 on cycle)
    this.currentTime = 0.1;
    this.updateLighting();
  }

  /**
   * Update the time system
   */
  public update(delta: number): void {
    // Advance time
    this.currentTime += this.cycleSpeed * delta;

    // Wrap around after full cycle
    if (this.currentTime >= 1.0) {
      this.currentTime = 0.0;
    }

    // Update lighting based on current time
    this.updateLighting();
  }

  /**
   * Update lighting colors and intensities based on time of day
   */
  private updateLighting(): void {
    // Get adjacent time periods for smooth interpolation
    const { current, next, blend } = this.getTimeBlend();

    // Interpolate colors
    const sunColor = new THREE.Color().lerpColors(
      current.sun,
      next.sun,
      blend
    );
    const ambientColor = new THREE.Color().lerpColors(
      current.ambient,
      next.ambient,
      blend
    );
    const fogColor = new THREE.Color().lerpColors(
      current.fog,
      next.fog,
      blend
    );

    // Interpolate intensities
    const sunIntensity = THREE.MathUtils.lerp(
      current.sunIntensity,
      next.sunIntensity,
      blend
    );
    const ambientIntensity = THREE.MathUtils.lerp(
      current.ambientIntensity,
      next.ambientIntensity,
      blend
    );

    // Apply to lights
    this.directionalLight.color.copy(sunColor);
    this.directionalLight.intensity = sunIntensity;
    this.ambientLight.color.copy(ambientColor);
    this.ambientLight.intensity = ambientIntensity;

    // Update fog color
    this.fog.color.copy(fogColor);

    // Update scene background to match fog
    this.scene.background = fogColor;
  }

  /**
   * Get current and next time colors with blend factor
   */
  private getTimeBlend(): {
    current: {
      sun: THREE.Color;
      ambient: THREE.Color;
      fog: THREE.Color;
      sunIntensity: number;
      ambientIntensity: number;
    };
    next: {
      sun: THREE.Color;
      ambient: THREE.Color;
      fog: THREE.Color;
      sunIntensity: number;
      ambientIntensity: number;
    };
    blend: number;
  } {
    // Time periods:
    // 0.0 - 0.25: Dawn
    // 0.25 - 0.5: Day
    // 0.5 - 0.75: Dusk
    // 0.75 - 1.0: Night

    if (this.currentTime < 0.25) {
      // Dawn -> Day
      return {
        current: this.timeColors.dawn,
        next: this.timeColors.day,
        blend: this.currentTime / 0.25,
      };
    } else if (this.currentTime < 0.5) {
      // Day -> Dusk
      return {
        current: this.timeColors.day,
        next: this.timeColors.dusk,
        blend: (this.currentTime - 0.25) / 0.25,
      };
    } else if (this.currentTime < 0.75) {
      // Dusk -> Night
      return {
        current: this.timeColors.dusk,
        next: this.timeColors.night,
        blend: (this.currentTime - 0.5) / 0.25,
      };
    } else {
      // Night -> Dawn
      return {
        current: this.timeColors.night,
        next: this.timeColors.dawn,
        blend: (this.currentTime - 0.75) / 0.25,
      };
    }
  }

  /**
   * Get current time of day period
   */
  public getTimeOfDay(): TimeOfDay {
    if (this.currentTime < 0.25) return TimeOfDay.DAWN;
    if (this.currentTime < 0.5) return TimeOfDay.DAY;
    if (this.currentTime < 0.75) return TimeOfDay.DUSK;
    return TimeOfDay.NIGHT;
  }

  /**
   * Get current time as 0-1 value
   */
  public getCurrentTime(): number {
    return this.currentTime;
  }

  /**
   * Set current time (for loading saved games)
   */
  public setCurrentTime(time: number): void {
    this.currentTime = Math.max(0, Math.min(1, time));
    this.updateLighting();
  }

  /**
   * Get time as hour (0-24)
   */
  public getHour(): number {
    return this.currentTime * 24;
  }

  /**
   * Check if it's daytime (good visibility)
   */
  public isDaytime(): boolean {
    return this.currentTime >= 0.2 && this.currentTime < 0.6;
  }

  /**
   * Check if it's nighttime (poor visibility)
   */
  public isNighttime(): boolean {
    return this.currentTime >= 0.7 || this.currentTime < 0.1;
  }

  /**
   * Serialize time state for saving
   */
  public serialize(): { currentTime: number } {
    return {
      currentTime: this.currentTime,
    };
  }

  /**
   * Deserialize time state from save
   */
  public deserialize(data: { currentTime: number }): void {
    this.setCurrentTime(data.currentTime);
  }
}
