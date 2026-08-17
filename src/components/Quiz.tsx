import { useMemo, useState } from "react";

export interface QuizOption {
  text: string;
  correct: boolean;
  /** Why this option is right, or why it is wrong. Shown for every option after answering. */
  why: string;
}

export interface QuizQuestion {
  id: string;
  topic: string;
  prompt: string;
  options: QuizOption[];
  /** Links that would have helped answer it. Shown with the explanation, not before. */
  references: { label: string; url: string }[];
}

interface Props {
  questions: QuizQuestion[];
  topicLabel: string;
}

const STORAGE_KEY = "quiz:scores";

function loadScore(topic: string) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, { right: number; wrong: number }>;
    return all[topic] ?? null;
  } catch {
    return null;
  }
}

function saveScore(topic: string, right: number, wrong: number) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    all[topic] = { right, wrong };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* private mode — the session still counts, it just will not persist */
  }
}

/** Fisher-Yates, seeded per mount so the order differs between sittings. */
function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export default function Quiz({ questions, topicLabel }: Props) {
  const deck = useMemo(() => shuffled(questions), [questions]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(() => loadScore(topicLabel)?.right ?? 0);
  const [wrong, setWrong] = useState(() => loadScore(topicLabel)?.wrong ?? 0);

  const question = deck[index];
  if (!question) {
    return <p className="section-note">No questions available for this topic yet.</p>;
  }

  const answered = picked !== null;
  const gotItRight = answered && (question.options[picked]?.correct ?? false);

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    const correct = question.options[i]?.correct ?? false;
    const nextRight = right + (correct ? 1 : 0);
    const nextWrong = wrong + (correct ? 0 : 1);
    setRight(nextRight);
    setWrong(nextWrong);
    saveScore(topicLabel, nextRight, nextWrong);
  };

  const next = () => {
    setPicked(null);
    setIndex((i) => (i + 1) % deck.length);
  };

  const resetScore = () => {
    setRight(0);
    setWrong(0);
    saveScore(topicLabel, 0, 0);
  };

  const answeredTotal = right + wrong;
  const accuracy = answeredTotal === 0 ? 0 : Math.round((right / answeredTotal) * 100);

  return (
    <div className="quiz">
      <div className="quiz-head">
        <span className="quiz-counter">
          {index + 1} / {deck.length}
        </span>
        <div className="quiz-score" role="status" aria-live="polite">
          <span className="quiz-right">{right} right</span>
          <span className="quiz-wrong">{wrong} wrong</span>
          <span className="quiz-accuracy">{accuracy}%</span>
        </div>
        <button type="button" className="quiz-reset" onClick={resetScore}>
          reset
        </button>
      </div>

      {/* Keyed by question so the card is genuinely replaced rather than mutated,
          which also resets any transition. */}
      <div className="quiz-card" key={question.id}>
        <p className="quiz-topic">{question.topic}</p>
        <p className="quiz-prompt">{question.prompt}</p>

        <ul className="quiz-options">
          {question.options.map((option, i) => {
            const state = !answered
              ? ""
              : option.correct
                ? " is-correct"
                : i === picked
                  ? " is-picked-wrong"
                  : " is-dimmed";
            return (
              <li key={option.text}>
                <button
                  type="button"
                  className={`quiz-option${state}`}
                  onClick={() => choose(i)}
                  disabled={answered}
                >
                  <span className="quiz-marker">{String.fromCharCode(65 + i)}</span>
                  <span>{option.text}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {answered && (
          <div className="quiz-feedback">
            <p className={`quiz-verdict ${gotItRight ? "t-healthy" : "t-alert"}`}>
              {gotItRight ? "Correct" : "Not quite"}
            </p>

            {/* Every option is explained, not only the one that was picked: knowing why
                the other three fail is what stops the same mistake next time. */}
            <ul className="quiz-why">
              {question.options.map((option, i) => (
                <li key={option.text} className={option.correct ? "is-correct" : "is-wrong"}>
                  <span className="quiz-marker">{String.fromCharCode(65 + i)}</span>
                  <span>{option.why}</span>
                </li>
              ))}
            </ul>

            {question.references.length > 0 && (
              <div className="quiz-refs">
                <p className="eyebrow">study this</p>
                <ul>
                  {question.references.map((ref) => (
                    <li key={ref.url}>
                      <a href={ref.url} target="_blank" rel="noreferrer noopener">
                        {ref.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button type="button" className="btn btn-primary" onClick={next}>
              Next question
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
