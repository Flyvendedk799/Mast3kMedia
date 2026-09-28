'use strict';

const ICONS = ['site', 'app', 'mobile', 'ai', 'shop', 'growth'];

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clip(value, max) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function fail(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function defaultPricing() {
  return {
    currency: '€',
    roundTo: 500,
    lowFactor: 0.9,
    highFactor: 1.15,
    resultNote: 'Et vejledende interval baseret på dine valg. Den endelige pris fastlægger vi sammen efter en kort samtale — uden overraskelser.',
    offerTitle: 'Vil du have et fast tilbud?',
    offerSub: 'Læg din mail — så sender vi en detaljeret pris og en plan inden for én arbejdsdag.',
    offerButton: 'Send mit estimat',
    offerFoot: 'Uforpligtende · ingen spam',
    successTitle: 'Sendt — tak!',
    successBody: 'Vi vender tilbage med et fast tilbud inden for én arbejdsdag.',
    disclaimer: 'Estimaterne er vejledende og uforpligtende. Endelig pris aftales efter en kort behovsafklaring.',
    hiddenHint: 'Dit estimat afsløres til sidst',
    steps: [
      {
        name: 'Type',
        question: 'Hvad skal vi bygge?',
        help: 'Vælg en eller flere. Du kan altid justere undervejs.',
        kind: 'base',
        select: 'multi',
        optional: false,
        columns: 3,
        mapsTo: 'project_type',
        options: [
          { name: 'Website / Landing', desc: '', meta: 'fra €6.000', icon: 'site', cost: 6000 },
          { name: 'Webapp / SaaS', desc: '', meta: 'fra €18.000', icon: 'app', cost: 18000 },
          { name: 'Mobilapp', desc: '', meta: 'fra €16.000', icon: 'mobile', cost: 16000 },
          { name: 'AI / Automatisering', desc: '', meta: 'fra €14.000', icon: 'ai', cost: 14000 },
          { name: 'E-commerce', desc: '', meta: 'fra €12.000', icon: 'shop', cost: 12000 },
          { name: 'Marketing / SEO', desc: '', meta: 'fra €5.000', icon: 'growth', cost: 5000 },
        ],
      },
      {
        name: 'Omfang',
        question: 'Hvor stort er omfanget?',
        help: 'Et fingerpeg om kompleksiteten — vi finjusterer sammen.',
        kind: 'mult',
        select: 'single',
        optional: false,
        columns: 2,
        mapsTo: '',
        options: [
          { name: 'Lille / MVP', desc: 'Én flade, kernefunktioner, hurtigt i luften.', meta: '−30%', icon: '', mult: 0.7 },
          { name: 'Mellem', desc: 'Flere flader, integrationer, brugerroller.', meta: 'basis', icon: '', mult: 1 },
          { name: 'Stort', desc: 'Komplet produkt med data, roller og admin.', meta: '+60%', icon: '', mult: 1.6 },
          { name: 'Enterprise', desc: 'Skala, compliance, SLA og dyb integration.', meta: '+160%', icon: '', mult: 2.6 },
        ],
      },
      {
        name: 'Design',
        question: 'Hvilket design-niveau?',
        help: 'Det er her vi adskiller os — vælg hvor langt vi skal gå.',
        kind: 'mult',
        select: 'single',
        optional: false,
        columns: 3,
        mapsTo: '',
        options: [
          { name: 'Standard', desc: 'Rent, solidt og hurtigt på vores systemer.', meta: 'basis', icon: '', mult: 1 },
          { name: 'Custom', desc: 'Skræddersyet designsystem til dit brand.', meta: '+25%', icon: '', mult: 1.25 },
          { name: 'Premium / motion', desc: 'Award-niveau med animation og polish.', meta: '+50%', icon: '', mult: 1.5 },
        ],
      },
      {
        name: 'Tidslinje',
        question: 'Hvad er din tidslinje?',
        help: 'Jo mere fleksibel, jo bedre pris.',
        kind: 'mult',
        select: 'single',
        optional: false,
        columns: 3,
        mapsTo: 'timeline',
        options: [
          { name: 'Fleksibel', desc: 'Vi passer det ind — du får rabat.', meta: '−5%', icon: '', mult: 0.95 },
          { name: '1–3 måneder', desc: 'Den typiske, sunde kadence.', meta: 'basis', icon: '', mult: 1 },
          { name: 'ASAP / haster', desc: 'Vi rydder kalenderen og rykker nu.', meta: '+30%', icon: '', mult: 1.3 },
        ],
      },
      {
        name: 'Tillæg',
        question: 'Skal vi tilføje noget?',
        help: 'Valgfrit — vælg det der giver mening for jer.',
        kind: 'add',
        select: 'multi',
        optional: true,
        columns: 3,
        mapsTo: '',
        options: [
          { name: 'SEO & vækst', desc: '', meta: '+€2.500', icon: '', cost: 2500 },
          { name: 'Vedligehold (årligt)', desc: '', meta: '+€4.000', icon: '', cost: 4000 },
          { name: 'Branding & identitet', desc: '', meta: '+€3.500', icon: '', cost: 3500 },
          { name: 'Integrationer', desc: '', meta: '+€3.000', icon: '', cost: 3000 },
          { name: 'AI-funktioner', desc: '', meta: '+€5.000', icon: '', cost: 5000 },
          { name: 'Content & SoMe', desc: '', meta: '+€2.000', icon: '', cost: 2000 },
        ],
      },
    ],
  };
}

function normalizePricing(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Ugyldig prisberegner');
  const currency = clip(input.currency || '€', 6) || '€';
  const roundTo = Math.round(num(input.roundTo, 500));
  if (roundTo < 1 || roundTo > 100000) fail('Afrunding skal være mellem 1 og 100000');
  const lowFactor = num(input.lowFactor, 0.9);
  const highFactor = num(input.highFactor, 1.15);
  if (lowFactor < 0.5 || lowFactor > 1) fail('Nedre faktor skal være mellem 0,5 og 1');
  if (highFactor < 1 || highFactor > 3) fail('Øvre faktor skal være mellem 1 og 3');
  if (!Array.isArray(input.steps) || !input.steps.length) fail('Mindst ét trin');
  if (input.steps.length > 8) fail('Højst 8 trin');

  const steps = input.steps.map((step, index) => {
    if (!step || typeof step !== 'object') fail('Ugyldigt trin');
    const kind = ['base', 'mult', 'add'].includes(step.kind) ? step.kind : '';
    if (!kind) fail('Trin ' + (index + 1) + ' skal være grundpris, faktor eller tillæg');
    const select = step.select === 'single' ? 'single' : 'multi';
    const name = clip(step.name, 40);
    const question = clip(step.question, 160);
    if (!name || !question) fail('Trin ' + (index + 1) + ' mangler navn eller spørgsmål');
    const options = Array.isArray(step.options) ? step.options : [];
    if (!options.length || options.length > 16) fail('Trin “' + name + '” skal have 1–16 valg');
    return {
      name,
      question,
      help: clip(step.help, 240),
      kind,
      select,
      optional: step.optional === true || step.optional === 1 || step.optional === '1',
      columns: Number(step.columns) === 2 ? 2 : 3,
      mapsTo: step.mapsTo === 'project_type' || step.mapsTo === 'timeline' ? step.mapsTo : '',
      options: options.map((opt, optIndex) => {
        if (!opt || typeof opt !== 'object') fail('Ugyldigt valg');
        const label = clip(opt.name, 80);
        if (!label) fail('Trin “' + name + '”, valg ' + (optIndex + 1) + ' mangler navn');
        const base = {
          name: label,
          desc: clip(opt.desc, 180),
          meta: clip(opt.meta, 40),
          icon: ICONS.includes(opt.icon) ? opt.icon : '',
        };
        if (kind === 'mult') {
          const mult = num(opt.mult, NaN);
          if (!Number.isFinite(mult) || mult <= 0 || mult > 10) fail('“' + label + '” skal have en faktor over 0 og højst 10');
          return { ...base, mult: Math.round(mult * 1000) / 1000 };
        }
        const cost = num(opt.cost, NaN);
        if (!Number.isFinite(cost) || cost < 0 || cost > 10000000) fail('“' + label + '” skal have en pris fra 0');
        return { ...base, cost: Math.round(cost) };
      }),
    };
  });

  return {
    currency,
    roundTo,
    lowFactor: Math.round(lowFactor * 1000) / 1000,
    highFactor: Math.round(highFactor * 1000) / 1000,
    resultNote: clip(input.resultNote, 400),
    offerTitle: clip(input.offerTitle, 120),
    offerSub: clip(input.offerSub, 300),
    offerButton: clip(input.offerButton, 60) || 'Send',
    offerFoot: clip(input.offerFoot, 80),
    successTitle: clip(input.successTitle, 80),
    successBody: clip(input.successBody, 300),
    disclaimer: clip(input.disclaimer, 300),
    hiddenHint: clip(input.hiddenHint, 80),
    steps,
  };
}

module.exports = { defaultPricing, normalizePricing, ICONS };
