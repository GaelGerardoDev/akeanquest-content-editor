export type FlagSetting = {
  flag: string;
  value: boolean;
};

export type FlaggedNode = {
  set_flag?: FlagSetting | null;
  check_flag?: string | null;
  check_flag_next?: number | null;
};

export type Choice = {
  label: string;
  next: number | null;
  rapport_delta?: -2 | 0 | 2;
  patience_delta?: -10 | 0 | 10;
};

export type PhraseBuilderNode = FlaggedNode & {
  type: "phrase_builder";
  prompt: string;
  choices: string[];
  answer: string[];
  success: number | null;
  failure: number | null;
  translation?: string;
};

export type DialogueNode = FlaggedNode & {
  type: "dialogue";
  speaker: string;
  text: string;
  next: number | null;
  translation?: string;
  word_ids?: string[];
  choices?: Choice[];
  set_flag_on_enter?: string;
};

export type QuizQuestion = {
  question: string;
  correct_answer: string;
};

export type QuizNode = FlaggedNode & {
  type: "quiz";
  /** Missing values are treated as manual for backward compatibility. */
  quiz_type?: "manual" | "dynamic";
  questions: QuizQuestion[];
  choices: string[];
  /** Destination when the learner answers the quiz correctly. */
  success?: number | null;
  /** Destination when the learner answers the quiz incorrectly. */
  failure?: number | null;
  /** Legacy single-output field; used as success when success is absent. */
  next?: number | null;
  /** Dynamic question templates; each supports [word] and [gloss] placeholders. */
  question_templates?: string[];
  /** Per-template answer display mode, aligned by index with question_templates. */
  question_template_choice_displays?: ("word" | "gloss")[];
  /** Legacy single-template field, read when question_templates is absent. */
  question_template?: string;
  /** Whether answer choices display the Akeanon word or its gloss. */
  choice_display?: "word" | "gloss";
  /** Word IDs eligible to generate dynamic questions and answer choices. */
  word_pool?: string[];
};

export type MinigameTriggerNode = FlaggedNode & {
  type: "minigame_trigger";
  minigame_type: string;
  success: number | null;
  failure: number | null;
};

export type StartRouter = FlaggedNode & {
  type: "start_router";
  start_index_if_flag: Record<string, number>;
};

export type Scene = Array<StartRouter | DialogueNode | PhraseBuilderNode | QuizNode | MinigameTriggerNode>;

export type IdleEntry = {
  speaker: string;
  text: string;
  word_ids: string[];
};

export type IdlePool = {
  low: IdleEntry[];
  med: IdleEntry[];
  high: IdleEntry[];
};

export type Chapter = Record<string, Scene | IdlePool>;

export function normalizeSceneTypes(scene: Scene): Scene {
  return scene.map((node) => {
    if ("speaker" in node && "text" in node && !("type" in node)) {
      return { ...node, type: "dialogue" } as DialogueNode;
    }
    if ("start_index_if_flag" in node && !("type" in node)) {
      return { ...node, type: "start_router" } as StartRouter;
    }
    return node;
  });
}
