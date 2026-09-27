export type SeoLang = 'ru' | 'en';

export interface SeoCopy {
  locale: string;
  title: string;
  description: string;
  keywords: string;
  ogAlt: string;
  h1: string;
  intro: string;
  featuresTitle: string;
  features: string[];
  howtoTitle: string;
  howto: string[];
  sectionsTitle: string;
  sections: { view: '' | 'fuel' | 'profit' | 'tech'; label: string }[];
  /** `{version}` and `{build}` come from the shipped gamedata.json. */
  version: string;
  otherLang: string;
  noscript: string;
}

// Only features that exist in the app; crawlers and players both read this before JS runs.
export const copy: Record<SeoLang, SeoCopy> = {
  ru: {
    locale: 'ru_RU',
    title: 'Alchemy Factory калькулятор — цепочки и рецепты',
    description:
      'Калькулятор производственных цепочек Alchemy Factory: рецепты и число машин, топливо и нагрев, удобрения, конвейеры, дерево исследований и прибыль.',
    keywords: 'alchemy factory калькулятор, alchemy factory рецепты, alchemy factory гайд, калькулятор производства, производственные цепочки',
    ogAlt: 'Alchemy Factory — калькулятор производственных цепочек',
    h1: 'Калькулятор Alchemy Factory',
    intro:
      'Бесплатный планировщик производственных цепочек для Alchemy Factory. Укажите, что и сколько производить в минуту: калькулятор подберёт рецепты, посчитает машины, конвейерные линии, топливо и удобрения, построит граф цепочки и покажет сырьё и затраты. Данные взяты из файлов игры.',
    featuresTitle: 'Что умеет',
    features: [
      'Граф производственной цепочки: машины, рецепты, конвейерные линии, излишки и сырьё.',
      'Альтернативные рецепты: вручную или с оптимизацией по сырью, числу машин или деньгам.',
      'Топливо и нагрев: рейтинг топлива на 1000 тепла/с, пар и нагреватели.',
      'Удобрения и уровни улучшений, которые влияют на расчёт.',
      'Рейтинг прибыли: что выгоднее всего производить на продажу.',
      'Дерево исследований и сеть заводов, которые снабжают друг друга.',
      'Сравнение двух планов, ссылка на завод, экспорт в CSV, Markdown, PNG и SVG.',
    ],
    howtoTitle: 'Как пользоваться',
    howto: [
      'Выберите предмет и нужную скорость в минуту или считайте от имеющегося входа.',
      'Задайте топливо, удобрение и уровни улучшений.',
      'Смотрите граф и сводку: машины, линии конвейера, сырьё и стоимость.',
      'Скопируйте ссылку на завод, чтобы поделиться планом.',
    ],
    sectionsTitle: 'Разделы',
    sections: [
      { view: '', label: 'Калькулятор цепочек' },
      { view: 'fuel', label: 'Рейтинг топлива' },
      { view: 'profit', label: 'Рейтинг прибыли' },
      { view: 'tech', label: 'Исследования' },
    ],
    version: 'Данные игры: v{version} (build {build})',
    otherLang: 'English version',
    noscript: 'Калькулятору нужен JavaScript: включите его в браузере и обновите страницу.',
  },
  en: {
    locale: 'en_US',
    title: 'Alchemy Factory Calculator — Production Chain Planner',
    description:
      'Free Alchemy Factory production chain calculator: recipes and machine ratios, fuel and heat, fertilizer, conveyor belts, the research tree and profit.',
    keywords: 'alchemy factory calculator, alchemy factory planner, alchemy factory recipes, production chain calculator, ratio calculator',
    ogAlt: 'Alchemy Factory production chain calculator',
    h1: 'Alchemy Factory Calculator',
    intro:
      'A free production chain planner for Alchemy Factory. Say what to make and how much per minute: the calculator picks recipes, counts machines, conveyor lanes, fuel and fertilizer, draws the chain as a graph and lists raw materials and costs. Data is extracted from the game files.',
    featuresTitle: 'Features',
    features: [
      'Production chain graph: machines, recipes, conveyor lanes, surplus and raw materials.',
      'Alternative recipes: pick by hand or optimize for raw materials, machine count or money.',
      'Fuel and heat: a fuel tier list per 1000 heat/s, steam and heaters.',
      'Fertilizer and upgrade levels that feed into the numbers.',
      'Profit tier list: what pays best to produce for the shop.',
      'Research tree and a network of factories that supply each other.',
      'Side-by-side plan comparison, factory share links, CSV, Markdown, PNG and SVG export.',
    ],
    howtoTitle: 'How to use',
    howto: [
      'Pick an item and the rate per minute, or calculate from the input you already have.',
      'Set the fuel, fertilizer and upgrade levels.',
      'Read the graph and the summary: machines, conveyor lanes, raw materials and cost.',
      'Copy the factory link to share the plan.',
    ],
    sectionsTitle: 'Sections',
    sections: [
      { view: '', label: 'Chain calculator' },
      { view: 'fuel', label: 'Fuel tier list' },
      { view: 'profit', label: 'Profit tier list' },
      { view: 'tech', label: 'Research' },
    ],
    version: 'Game data: v{version} (build {build})',
    otherLang: 'Русская версия',
    noscript: 'The calculator needs JavaScript: enable it in your browser and reload the page.',
  },
};
