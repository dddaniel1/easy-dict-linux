export interface Phonetic {
  type: string;
  symbol: string;
  audio_url?: string;
}

export interface Definition {
  pos: string;
  meanings: string[];
}

export interface Sentence {
  source: string;
  target: string;
  source_dict?: string;
}

export interface ServiceResult {
  service_id: string;
  service_name: string;
  status: "success" | "error" | "loading";
  error?: string;
  is_dictionary: boolean;
  phonetics?: Phonetic[];
  definitions?: Definition[];
  translation?: string;
  sentences?: Sentence[];
}

export interface AppConfig {
  enabled_services: string[];
  default_target_lang: string;
  ai_enabled: boolean;
  ai_base_url: string;
  ai_api_key: string;
  ai_model: string;
  deepl_enabled: boolean;
  deepl_auth_key: string;
  deepl_is_free: boolean;
  auto_query_clipboard: boolean;
  auto_show_floating_button: boolean;
  always_on_top: boolean;
  shortcut_input: string;
  shortcut_selection: string;
  shortcut_ocr: string;
  shortcut_ocr_silent: string;
  theme: "auto" | "light" | "dark";
}

declare global {
  interface Window {
    mygo?: {
      call: (method: string, ...args: any[]) => Promise<any>;
    };
    __easydict_query?: (text: string, config?: AppConfig) => void;
    __easydict_focus_input?: () => void;
    __easydict_set_pinned?: (pinned: boolean) => void;
    __easydict_open_settings?: () => void;
    __easydict_reset_bubble?: () => void;
    __easydict_selection_window?: boolean;
  }
}
