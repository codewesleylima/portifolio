import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/locale-config";
import { translatePage } from "@/lib/translate-dom";

/**
 * Static dictionary rather than a live translation API.
 *
 * A machine-translation call per page view would mangle exactly the words that carry
 * the meaning here — "observability", "Spring Boot", "event-driven", "sliding window"
 * — while adding latency, an upstream dependency and a rate limit to every visit. The
 * strings below are translated once, ship with the bundle, switch instantly, and keep
 * technical vocabulary intact in every language.
 *
 * Proper nouns, repository names and code are deliberately never translated.
 */

export { LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/locale-config";

type Dict = Record<string, string>;

const STRINGS: Record<Locale, Dict> = {
  en: {
    "nav.home": "Home",
    "nav.resume": "Resume",
    "nav.studies": "Studies",
    "nav.recommendations": "Recommendations",
    "nav.channel": "Media",
    "nav.console": "Console",
    "nav.options": "Options",
    "nav.language": "Language",
    "hero.role": "Backend Software Engineer II · Itaú Unibanco · São Paulo",
    "hero.thesis":
      "Backend engineer working on software engineering and architecture for the Personal Insurance systems at Itaú Unibanco. My work covers backend development, code review, acting on what observability and metrics surface, and driving discussions on solution design and engineering practice — increasingly with AI in the loop.",
    "section.arcade": "Debug run",
    "section.registry": "Service registry",
    "section.telemetry": "Stack telemetry",
    "section.history": "Deploy log",
    "studies.title": "Algorithms, under protocol",
    "recommendations.title": "Recommendations",
    "channel.title": "Channel",
    "footer.license": "License",
    "action.repository": "Study repository ↗",
    "action.channel": "Open the channel ↗",
  },
  pt: {
    "nav.home": "Início",
    "nav.resume": "Currículo",
    "nav.studies": "Estudos",
    "nav.recommendations": "Recomendações",
    "nav.channel": "Mídia",
    "nav.console": "Console",
    "nav.options": "Opções",
    "nav.language": "Idioma",
    "hero.role": "Engenheiro de Software Backend II · Itaú Unibanco · São Paulo",
    "hero.thesis":
      "Engenheiro backend atuando em engenharia e arquitetura de software nos sistemas de Seguros de Pessoa Física do Itaú Unibanco. Meu trabalho abrange desenvolvimento backend, revisão de código, ação sobre o que a observabilidade e as métricas revelam, e condução de discussões sobre desenho de solução e prática de engenharia — cada vez mais com IA no processo.",
    "section.arcade": "Depuração",
    "section.registry": "Registro de serviços",
    "section.telemetry": "Telemetria da stack",
    "section.history": "Histórico de deploys",
    "studies.title": "Algoritmos, sob protocolo",
    "recommendations.title": "Recomendações",
    "channel.title": "Canal",
    "footer.license": "Licença",
    "action.repository": "Repositório de estudos ↗",
    "action.channel": "Abrir o canal ↗",
  },
  es: {
    "nav.home": "Inicio",
    "nav.resume": "Currículum",
    "nav.studies": "Estudios",
    "nav.recommendations": "Recomendaciones",
    "nav.channel": "Canal",
    "nav.console": "Consola",
    "nav.options": "Opciones",
    "nav.language": "Idioma",
    "hero.role": "Ingeniero de Software Backend II · Itaú Unibanco · São Paulo",
    "hero.thesis":
      "Ingeniero backend en ingeniería y arquitectura de software para los sistemas de Seguros de Personas Físicas en Itaú Unibanco. Mi trabajo abarca desarrollo backend, revisión de código, actuar sobre lo que revelan la observabilidad y las métricas, y conducir discusiones sobre diseño de soluciones y práctica de ingeniería — cada vez más con IA en el proceso.",
    "section.arcade": "Depuración",
    "section.registry": "Registro de servicios",
    "section.telemetry": "Telemetría del stack",
    "section.history": "Registro de despliegues",
    "studies.title": "Algoritmos, bajo protocolo",
    "recommendations.title": "Recomendaciones",
    "channel.title": "Canal",
    "footer.license": "Licencia",
    "action.repository": "Repositorio de estudios ↗",
    "action.channel": "Abrir el canal ↗",
  },
  fr: {
    "nav.home": "Accueil",
    "nav.resume": "CV",
    "nav.studies": "Études",
    "nav.recommendations": "Recommandations",
    "nav.channel": "Médias",
    "nav.console": "Console",
    "nav.options": "Options",
    "nav.language": "Langue",
    "hero.role": "Ingénieur logiciel backend II · Itaú Unibanco · São Paulo",
    "hero.thesis":
      "Ingénieur backend en ingénierie et architecture logicielle pour les systèmes d'assurance des particuliers chez Itaú Unibanco. Mon travail couvre le développement backend, la revue de code, l'action sur ce que révèlent l'observabilité et les métriques, et l'animation des discussions sur la conception des solutions et les pratiques d'ingénierie — de plus en plus avec l'IA dans la boucle.",
    "section.arcade": "Débogage",
    "section.registry": "Registre des services",
    "section.telemetry": "Télémétrie de la stack",
    "section.history": "Journal des déploiements",
    "studies.title": "Algorithmes, sous protocole",
    "recommendations.title": "Recommandations",
    "channel.title": "Chaîne",
    "footer.license": "Licence",
    "action.repository": "Dépôt d'études ↗",
    "action.channel": "Ouvrir la chaîne ↗",
  },
  de: {
    "nav.home": "Start",
    "nav.resume": "Lebenslauf",
    "nav.studies": "Studium",
    "nav.recommendations": "Empfehlungen",
    "nav.channel": "Medien",
    "nav.console": "Konsole",
    "nav.options": "Optionen",
    "nav.language": "Sprache",
    "hero.role": "Backend Software Engineer II · Itaú Unibanco · São Paulo",
    "hero.thesis":
      "Backend-Engineer für Software-Engineering und Architektur der Personenversicherungssysteme bei Itaú Unibanco. Meine Arbeit umfasst Backend-Entwicklung, Code-Reviews, das Handeln nach dem, was Observability und Metriken zeigen, sowie das Führen von Diskussionen über Lösungsdesign und Engineering-Praxis — zunehmend mit KI im Prozess.",
    "section.arcade": "Debug-Lauf",
    "section.registry": "Service-Registry",
    "section.telemetry": "Stack-Telemetrie",
    "section.history": "Deploy-Protokoll",
    "studies.title": "Algorithmen, nach Protokoll",
    "recommendations.title": "Empfehlungen",
    "channel.title": "Kanal",
    "footer.license": "Lizenz",
    "action.repository": "Studien-Repository ↗",
    "action.channel": "Kanal öffnen ↗",
  },
  it: {
    "nav.home": "Home",
    "nav.resume": "Curriculum",
    "nav.studies": "Studi",
    "nav.recommendations": "Raccomandazioni",
    "nav.channel": "Media",
    "nav.console": "Console",
    "nav.options": "Opzioni",
    "nav.language": "Lingua",
    "hero.role": "Backend Software Engineer II · Itaú Unibanco · São Paulo",
    "hero.thesis":
      "Ingegnere backend che lavora su ingegneria e architettura software per i sistemi di assicurazione per privati di Itaú Unibanco. Il mio lavoro copre sviluppo backend, revisione del codice, azioni basate su ciò che osservabilità e metriche rivelano, e la conduzione di discussioni su progettazione delle soluzioni e pratica ingegneristica — sempre più con l'IA nel processo.",
    "section.arcade": "Debug run",
    "section.registry": "Registro dei servizi",
    "section.telemetry": "Telemetria dello stack",
    "section.history": "Log dei deploy",
    "studies.title": "Algoritmi, sotto protocollo",
    "recommendations.title": "Raccomandazioni",
    "channel.title": "Canale",
    "footer.license": "Licenza",
    "action.repository": "Repository di studio ↗",
    "action.channel": "Apri il canale ↗",
  },
  zh: {
    "nav.home": "首页",
    "nav.resume": "简历",
    "nav.studies": "学习",
    "nav.recommendations": "推荐",
    "nav.channel": "媒体",
    "nav.console": "控制台",
    "nav.options": "选项",
    "nav.language": "语言",
    "hero.role": "后端软件工程师 II · Itaú Unibanco · 圣保罗",
    "hero.thesis":
      "后端工程师，负责 Itaú Unibanco 个人保险系统的软件工程与架构。工作范围包括后端开发、代码评审、根据可观测性与指标采取行动，以及推动关于方案设计与工程实践的讨论——并越来越多地将 AI 纳入其中。",
    "section.arcade": "调试运行",
    "section.registry": "服务注册表",
    "section.telemetry": "技术栈遥测",
    "section.history": "部署日志",
    "studies.title": "算法：遵循协议",
    "recommendations.title": "推荐",
    "channel.title": "频道",
    "footer.license": "许可证",
    "action.repository": "学习仓库 ↗",
    "action.channel": "打开频道 ↗",
  },
  ja: {
    "nav.home": "ホーム",
    "nav.resume": "経歴",
    "nav.studies": "学習",
    "nav.recommendations": "推薦",
    "nav.channel": "メディア",
    "nav.console": "コンソール",
    "nav.options": "オプション",
    "nav.language": "言語",
    "hero.role": "バックエンドソフトウェアエンジニア II · Itaú Unibanco · サンパウロ",
    "hero.thesis":
      "Itaú Unibanco の個人保険システムにおいて、ソフトウェアエンジニアリングとアーキテクチャを担当するバックエンドエンジニア。バックエンド開発、コードレビュー、オブザーバビリティとメトリクスに基づく対応、そして設計とエンジニアリング実践に関する議論の推進を行っており、AI の活用も進めています。",
    "section.arcade": "デバッグラン",
    "section.registry": "サービスレジストリ",
    "section.telemetry": "スタックテレメトリ",
    "section.history": "デプロイログ",
    "studies.title": "アルゴリズム、プロトコルに基づく",
    "recommendations.title": "推薦",
    "channel.title": "チャンネル",
    "footer.license": "ライセンス",
    "action.repository": "学習リポジトリ ↗",
    "action.channel": "チャンネルを開く ↗",
  },
  ko: {
    "nav.home": "홈",
    "nav.resume": "이력서",
    "nav.studies": "학습",
    "nav.recommendations": "추천",
    "nav.channel": "미디어",
    "nav.console": "콘솔",
    "nav.options": "옵션",
    "nav.language": "언어",
    "hero.role": "백엔드 소프트웨어 엔지니어 II · Itaú Unibanco · 상파울루",
    "hero.thesis":
      "Itaú Unibanco 개인 보험 시스템의 소프트웨어 엔지니어링과 아키텍처를 담당하는 백엔드 엔지니어입니다. 백엔드 개발, 코드 리뷰, 관측 가능성과 지표에 근거한 대응, 그리고 솔루션 설계와 엔지니어링 관행에 대한 논의를 이끌고 있으며 AI 활용도 넓혀가고 있습니다.",
    "section.arcade": "디버그 런",
    "section.registry": "서비스 레지스트리",
    "section.telemetry": "스택 텔레메트리",
    "section.history": "배포 로그",
    "studies.title": "프로토콜에 따른 알고리즘",
    "recommendations.title": "추천",
    "channel.title": "채널",
    "footer.license": "라이선스",
    "action.repository": "학습 저장소 ↗",
    "action.channel": "채널 열기 ↗",
  },
  ru: {
    "nav.home": "Главная",
    "nav.resume": "Резюме",
    "nav.studies": "Обучение",
    "nav.recommendations": "Рекомендации",
    "nav.channel": "Медиа",
    "nav.console": "Консоль",
    "nav.options": "Опции",
    "nav.language": "Язык",
    "hero.role": "Бэкенд-разработчик II · Itaú Unibanco · Сан-Паулу",
    "hero.thesis":
      "Бэкенд-инженер, отвечающий за разработку и архитектуру систем личного страхования в Itaú Unibanco. Работа включает бэкенд-разработку, ревью кода, действия на основе данных наблюдаемости и метрик, а также ведение обсуждений по проектированию решений и инженерным практикам — всё чаще с участием ИИ.",
    "section.arcade": "Отладочный забег",
    "section.registry": "Реестр сервисов",
    "section.telemetry": "Телеметрия стека",
    "section.history": "Журнал развёртываний",
    "studies.title": "Алгоритмы по протоколу",
    "recommendations.title": "Рекомендации",
    "channel.title": "Канал",
    "footer.license": "Лицензия",
    "action.repository": "Репозиторий обучения ↗",
    "action.channel": "Открыть канал ↗",
  },
};

const STORAGE_KEY = "portfolio:locale";

interface LocaleValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => STRINGS[DEFAULT_LOCALE][key] ?? key,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Route changes replace the page content with untranslated English, so the pass
  // has to re-run on navigation, not only when the locale itself changes.
  // Read from the router rather than from window.location, which does not update
  // on client-side navigation.
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  // Always starts at the default: reading storage during render would produce
  // different markup on server and client and break hydration.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && saved in LOCALES) setLocaleState(saved);
    } catch {
      /* storage disabled — stay on the default */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;

    /**
     * Several sweeps rather than one.
     *
     * A single pass 60ms after the switch misses anything that mounts later: the About
     * panel, the boot sequence, the live repository fetch resolving, a route's content
     * arriving. The MutationObserver is meant to catch those, but it only fires on
     * mutations it observes — content already rendered between the switch and the
     * observer being attached is invisible to it. Repeating the sweep closes that
     * window, and repeats are free because everything already translated is a cache
     * hit with no request behind it.
     */
    const ids = [60, 500, 1400, 3000].map((delay) =>
      window.setTimeout(() => void translatePage(locale), delay),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [locale, pathname]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* the choice still applies for this session */
    }
  };

  // Falling back to English rather than to the key itself: a missing translation
  // should read as untranslated prose, never as "section.registry".
  const t = (key: string) => STRINGS[locale][key] ?? STRINGS[DEFAULT_LOCALE][key] ?? key;

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>
  );
}

export const useLocale = () => useContext(LocaleContext);

/**
 * Every string the dictionary can render, in any locale.
 *
 * The DOM pass assumes the text it finds is English, because that is the source
 * language it asks the provider to translate from. Dictionary strings are already in
 * the target language after a switch — sending "Início" to be translated from English
 * to Portuguese produces nonsense. Skipping anything the dictionary owns keeps the two
 * layers from fighting over the same nodes.
 */
export const DICTIONARY_VALUES: ReadonlySet<string> = new Set(
  Object.values(STRINGS).flatMap((dict) => Object.values(dict).map((v) => v.trim())),
);
