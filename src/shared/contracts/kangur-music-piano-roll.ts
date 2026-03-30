export const KANGUR_MUSIC_PIANO_ROLL_GAME_IDS = {
  freePlay: 'music_piano_roll_free_play',
  repeat: 'music_melody_repeat',
} as const;

export const KANGUR_MUSIC_PIANO_ROLL_ENGINE_IDS = {
  freePlay: 'piano-roll-engine',
  repeat: 'melody-repeat-engine',
} as const;

export const KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS = {
  freePlay: 'music_piano_roll_free_play_quiz',
  repeat: 'music_melody_repeat_quiz',
} as const;

export const KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS = {
  freePlay: 'music_piano_roll_free_play_game',
  repeat: 'music_melody_repeat_game',
} as const;

export const KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_GAME_SCREENS = [
  KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.repeat,
  KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.freePlay,
] as const;

export const KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_GAME_RUNTIME_RENDERER_IDS = [
  KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS.repeat,
  KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS.freePlay,
] as const;
