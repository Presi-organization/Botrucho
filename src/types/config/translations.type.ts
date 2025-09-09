export interface TranslationsType {
  LANGUAGES: TranslationElement<LanguagesKeys>;
  MISC: TranslationElement<MiscKeys>;
  VC: TranslationElement<VCKeys>;
  MUSIC: TranslationElement<MusicKeys>;
  _COMMANDS: string;
  COIN: TranslationElement<CoinKeys>;
  DICE: TranslationElement<DiceKeys>;
  AVATAR: TranslationElement<AvatarKeys>;
  CRONS: TranslationElement<CronsKeys>;
  EVENT: TranslationElement<EventKeys>;
  LANGUAGE: TranslationElement<LanguageKeys>
  MOVE: TranslationElement<MoveKeys>;
  PING: TranslationElement<PingKeys>;
  PRUNE: TranslationElement<PruneKeys>;
  SERVER_INFO: TranslationElement<ServerInfoKeys>;
  TOGGLE_COMMAND: TranslationElement<ToggleCommandKeys>;
  USER_INFO: TranslationElement<UserInfoKeys>;
  LEAVE: TranslationElement<LeaveKeys>;
  LYRICS: TranslationElement<LyricsKeys>;
  PLAY: TranslationElement<PlayKeys>;
  SHUFFLE: TranslationElement<ShuffleKeys>;
  SKIP: TranslationElement<SkipKeys>;
  VOLUME: TranslationElement<VolumeKeys>;
  SAY: TranslationElement<SayKeys>;
  FINES: TranslationElement<FinesKeys>;
  SIATA: TranslationElement<SiataKeys>;
  TFT_ELO: TranslationElement<TftEloKeys>;
  _EVENTS: string;
  DELETE: TranslationElement<DeleteKeys>
  PLAYER: TranslationElement<PlayerKeys>
}

export type TranslationElement<T extends string> = Record<T, string>;

export type LanguagesKeys = 'ES' | 'EN';
export type MiscKeys = 'YES' | 'NO' | 'ERROR' | 'NOT_POSSIBLE' | 'COMMAND_ENABLED' | 'COMMAND_DISABLED';
export type VCKeys = 'CONNECT_VC' | 'USER_NOT_IN';
export type MusicKeys = 'NOT_PLAYING_TITLE' | 'NOT_PLAYING_DESC';
export type CoinKeys = 'COIN_FLIP' | 'HEADS' | 'TAILS';
export type DiceKeys = 'ROLL' | 'RESULT' | 'INITIAL_TITLE' | 'INITIAL_FOOTER' | 'RESULT_TITLE' | 'RESULT_FOOTER';
export type AvatarKeys = 'USER' | 'SELF';
export type CronsKeys =
  'CRON_JOBS'
  | 'NOT_FOUND'
  | 'DESTROYED'
  | 'SELECT_PLACEHOLDER'
  | 'ACTION_EDIT'
  | 'ACTION_DESTROY'
  | 'ACTION_ADD_METADATA_FIELD'
  | 'LAST_RUN'
  | 'NEVER';
export type EventKeys =
  'MODAL_TITLE'
  | 'NAME'
  | 'DATE'
  | 'TIME'
  | 'DESCRIPTION'
  | 'LOCATION'
  | 'EVENT_CREATED'
  | 'ASSISTANCE_CONFIRMED'
  | 'ASSISTANCE_CONFIRMATION'
  | 'INVITATION_LINK'
  | 'EVENT_GENERATED';
export type LanguageKeys = 'CURRENT_LANG' | 'LANG_CHANGED';
export type MoveKeys = 'USER_MOVED';
export type PingKeys = 'PINGING' | 'PONG';
export type PruneKeys = 'AMOUNT_ERR' | 'ERR' | 'SUCCESS';
export type ServerInfoKeys = 'TITLE' | 'ONLY_SERVER' | 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
export type ToggleCommandKeys = 'ENABLED' | 'DISABLED' | 'NOT_FOUND' | 'NOT_ALLOWED';
export type UserInfoKeys = 'USERNAME' | 'ID';
export type LeaveKeys = 'DISCONNECTED' | 'SUCCESS';
export type LyricsKeys = 'NO_QUEUE' | 'NOT_FOUND' | 'SYNCED_LYRICS';
export type PlayKeys = 'NO_RESULTS_TITLE' | 'NO_RESULTS_DESC' | 'ADDED_2_QUEUE_TITLE' | 'ADDED_2_QUEUE_DESC';
export type ShuffleKeys = 'SHUFFLED';
export type SkipKeys = 'SKIPPED_TITLE' | 'SKIPPED_DESC';
export type VolumeKeys =
  'VOLUME_CHANGED_TITLE'
  | 'VOLUME_CHANGED_DESC'
  | 'CURRENT_VOLUME_TITLE'
  | 'CURRENT_VOLUME_DESC';
export type SayKeys = 'SYNTHESIZING';
export type FinesKeys = 'TITLE' | 'DESC';
export type SiataKeys = 'ZOOM' | 'ERR';
export type TftEloKeys =
  'ELO'
  | 'SUMMONER_NOT_FOUND'
  | 'UNRANKED'
  | 'GAME_MODE'
  | 'RANK'
  | 'WINS_LOSSES'
  | 'STREAK'
  | 'FRESH_BLOOD'
  | 'INACTIVE';
export type DeleteKeys = 'LEAVE';
export type PlayerKeys = 'NOW_PLAYING' | 'SONG' | 'REQUESTED_BY' | 'TRACKS_LEFT';
