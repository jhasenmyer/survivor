# Audio Assets

This directory contains audio files for the survival game.

## Required Files

The following audio files are needed for the game to function properly:

### 1. forest_ambient.mp3
- **Type:** Looping ambient background sound
- **Duration:** ~60 seconds
- **Size:** ~1MB
- **Description:** Natural forest ambiance with birds, wind, rustling leaves
- **Source:** Freesound.org, OpenGameArt.org, or zapsplat.com

### 2. footstep_grass.mp3
- **Type:** One-shot sound effect
- **Duration:** ~0.3 seconds
- **Size:** ~10KB
- **Description:** Single footstep on grass/dirt surface
- **Source:** Freesound.org (search "grass footstep")

### 3. tree_chop.mp3
- **Type:** One-shot sound effect
- **Duration:** ~0.5 seconds
- **Size:** ~15KB
- **Description:** Axe hitting wood
- **Source:** Freesound.org (search "wood chop" or "axe")

### 4. item_pickup.mp3
- **Type:** One-shot sound effect
- **Duration:** ~0.2 seconds
- **Size:** ~8KB
- **Description:** Generic item collection/pickup sound
- **Source:** Freesound.org (search "item pickup" or "collect")

## Free Audio Sources

1. **Freesound.org** - CC0 licensed sounds (https://freesound.org)
2. **OpenGameArt.org** - Public domain game audio (https://opengameart.org)
3. **Zapsplat.com** - Free with attribution (https://www.zapsplat.com)

## Temporary Placeholders

For development purposes, the game will gracefully handle missing audio files by logging warnings without crashing. However, for the full experience, all audio files should be present.

## Format Requirements

- **Format:** MP3 (widely supported)
- **Sample Rate:** 44100 Hz recommended
- **Bit Rate:** 128-192 kbps for effects, 256 kbps for ambient
- **Channels:** Mono for effects, Stereo for ambient
