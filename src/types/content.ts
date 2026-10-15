export type Choice = {
  label: string;
  next: number | null;
  rapport_delta?: -2 | 0 | 2;
  patience_delta?: -10 | 0 | 10;
};

export type PhraseBuilderNode = {
  type: "phrase_builder";
  prompt: string;
  choices: string[];
  answer: string[];
  success: number | null;
  failure: number | null;
  translation?: string;
};

export type DialogueNode = {
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

export type QuizNode = {
  type: "quiz";
  questions: QuizQuestion[];
  choices: string[];
  next: number | null;
};

export type StartRouter = {
  type: "start_router";
  start_index_if_flag: Record<string, number>;
};

export type Scene = Array<StartRouter | DialogueNode | PhraseBuilderNode | QuizNode>;

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
