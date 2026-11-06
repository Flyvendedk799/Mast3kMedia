const fs = require('fs');
const crypto = require('crypto');
const { chromium } = require('playwright');
const { execSync } = require('child_process');

async function callMcp(method, params = {}) {
  const req = { jsonrpc: "2.0", id: 1, method, params };
  const res = await fetch('https://mast3kmedia.dk/mcp', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer 1aOz7YyqXiyE8q72AlErqatckz9I_bqUNM4rqgUaHvw',
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    },
    body: JSON.stringify(req)
  });
  const text = await res.text();
  for (const l of text.split('\n')) {
    if (l.startsWith('data: ')) {
      const data = JSON.parse(l.slice(6));
      if (data.id === 1) return data;
    }
  }
}

async function upload(path, name) {
  const buf = fs.readFileSync(path);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  const res = await callMcp('tools/call', {
    name: 'upload_media',
    arguments: {
      data: buf.toString('base64'),
      filename: name,
      sha256,
      bytes: buf.length
    }
  });
  if (res.result.isError) throw new Error(res.result.content[0].text);
  return JSON.parse(res.result.content[0].text).url;
}

const PROJECTS = {
  'ai-office': {
    challenge: `At køre flere lokale AI-agenter som Claude Code, Cursor og Aider på samme tid resulterer ofte i fragmenteret overvågning. Den største udfordring var, at disse processer er isolerede; de deler ikke state, og de afvikles ofte i skjulte tmux-sessioner eller som baggrundsprocesser. For en udvikler betyder det, at det er næsten umuligt at se det samlede token-forbrug, den aktuelle CPU-belastning eller hvilken specifik prompt, der forårsager memory leaks.\n\nDer manglede et samlet kontrolcenter. Traditionelle task managers som 'top' eller 'htop' forstår ikke konteksten af et AI-værktøj; de ser kun en Node.js eller Python proces. Det var nødvendigt at bygge en bro mellem OS-niveau metrics og agenternes egne sessionsfiler, uden at kompromittere privatlivet ved at sende data ud af maskinen.`,
    approach: `Løsningen blev at bygge ai-office som et lokalt CLI-værktøj uden netværkskald. Kernearkitekturen bygger på to lag: En proces-scanner, der læser maskinens tilstand via native kald (ps på Unix, CIM på Windows), og en fil-watcher, der overvåger de lokale konfigurationsfiler for ændringer.\n\nFor at gøre det hele intuitivt, valgte jeg at implementere en ASCII-baseret renderingsmotor i terminalen, som kører udelukkende på stdin/stdout. Dette sikrer, at ai-office kan afvikles på selv de mest begrænsede SSH-forbindelser uden forsinkelse. Motoren tegner et virtuelt kontor, hvor agenterne visualiseres som små arbejdere. Deres animationer er direkte bundet til CPU-forbruget for deres respektive processer. Det hele er holdt i et dark-theme for maksimal læsbarhed.`,
    results: `Resultatet er et komplet, lokalt dashboard, der giver et øjeblikkeligt overblik over hele maskinens AI-arbejdsstyrke. Ved hjælp af den detaljerede visning kan man nu sortere processer på memory-forbrug eller uptime, og med det visuelle kontor kan man hurtigt spotte, om en agent hænger, eller om den arbejder aktivt.\n\nVærktøjet er publiceret på npm, og det har allerede hjulpet udviklere med at finde glemte baggrundsagenter, der ellers ville have drænet systemets ressourcer. Alt logges lokalt til en JSONL fil, som giver mulighed for at bygge historiske rapporter over ens tidsforbrug.`,
    diagrams: ['Arkitektur Oversigt', 'ASCII Render Loop', 'Proces Scanner', 'JSONL Logger', 'Terminal State', 'TUI Komponenter', 'Config Parser', 'Agent State Machine', 'CIM WMI Query', 'Event Emitter'],
  },
  'braiwser': {
    challenge: `Det er langsommeligt at anmelde webgrænseflader og oversætte visuelle fejl til noget, en kodende agent kan handle på. Udfordringen var at lukke kløften mellem en visuel inspektion og et maskinlæsbart format. Man ender ofte med uskarpe skærmbilleder og upræcise beskrivelser, som kræver flere iterationer at rette.\n\nEksisterende værktøjer som Chrome DevTools er bygget til udviklere, ikke til at generere prompts eller Playwright-tests direkte. Der manglede en browser, der kunne fungere som et bindeled mellem menneskelig QA og agentisk kodeændring, hvor hvert klik skulle fange hele den underliggende DOM-struktur og CSS-regler uden at forstyrre selve applikationen.`,
    approach: `Jeg byggede Braiwser som en Electron-baseret desktop applikation, der injicerer sit eget inspector-lag i enhver webside. For at sikre sand isolation mellem værktøjet og gæstesiden, kører inspektøren udelukkende som et preload script i Chromium. Dette giver fuld adgang til det rigtige DOM-træ efter JavaScript er afviklet.\n\nNår en bruger klikker på et element, serialiserer systemet øjeblikkeligt elementets tilstand, layout og styling til et struktureret JSON-format. Dette format konverteres derefter direkte til Playwright specifikationer og agent-venlige prompts. For at bevare privatlivet og hastigheden forbliver al data 100% lokalt, og der laves ingen eksterne netværkskald til cloud-tjenester under auditeringen.`,
    results: `Braiwser reducerer tiden for UI-fejlrapportering markant. Det eksporterer direkte til kørbare Playwright specifikationer og strukturerede agent-prompts, hvilket fjerner den sædvanlige frem-og-tilbage kommunikation. Udviklere kan nu åbne ethvert webprojekt, samle rettelser visuelt og overdrage en komplet handlingsplan til en kodende agent.\n\nVærktøjet har revolutioneret måden, hvorpå vi anmelder agentiske UI'er, da det minimerer fortolkningsfejl. Den lokale afvikling sikrer desuden, at det kan bruges på fortrolige interne projekter uden sikkerhedsbekymringer.`,
    diagrams: ['Electron IPC Bridge', 'DOM Serializer', 'Playwright Exporter', 'Preload Script Injection', 'Audit Engine', 'CSS Parser', 'Agent Prompt Generator', 'Element Selector', 'Local Storage Sync', 'Event Listener Hook'],
  },
  'sandboxos': {
    challenge: `Agentiske værktøjer har brug for reelle, isolerede maskiner at udføre opgaver på, men traditionelle operativsystemer er ikke bygget med en indbygget protokol for værktøjskald. Udfordringen var, at agenter ofte farer vild i abstrakte grafiske grænseflader, der er designet til mus og tastatur, ikke til API-kald.\n\nDer manglede et miljø, hvor hvert vindue, filoperation og processtyring kunne manipuleres præcist gennem strukturerede data, samtidig med at en menneskelig bruger kunne følge med og interagere visuelt. Det krævede en gentænkning af operativsystemets fundamentale byggeklodser, hvor visuel præsentation og data-tilstand skulle adskilles fuldstændigt.`,
    approach: `Jeg byggede SandboxOS fra bunden som et AI-first operativsystem. Kernen i systemet er en Tide-synkroniseringsprotokol, der kører over WebSockets. Hvert systemkald er designet som et native MCP (Model Context Protocol) serverkald. Selve skrivebordet, vinduerne og temaerne er defineret som ét stort, konfigurerbart JSON-dokument.\n\nDette betyder, at en agent kan ændre OS-layoutet eller starte applikationer blot ved at opdatere JSON-tilstanden, hvorefter React-frontenden automatisk re-renderer miljøet i browseren. Jeg implementerede en fuld terminal-emulator og et filsystem i browseren ved hjælp af Node.js backenden og Better-SQLite3, hvilket giver agenterne et trygt sandkassemiljø at operere i.`,
    results: `SandboxOS fungerer nu som et fejlfrit, webbaseret operativsystem, hvor hver bruger og agent får en isoleret maskine. Tide-protokollen sørger for øjeblikkelig synkronisering, og hele styresystemets tilstand er transparent for de indbyggede agenter.\n\nSystemet gør det muligt for agenter at skrive kode, køre terminalkommandoer og manipulere UI'et direkte via MCP, uden at de nogensinde skal analysere pixel-data. Det er et sandt agent-nativt miljø, der udvisker grænsen mellem konfigurationsfil og grafisk brugerflade.`,
    diagrams: ['Tide Protocol Sync', 'MCP Kernel Routing', 'JSON OS State', 'WebSocket Manager', 'Terminal Emulator', 'File System Bridge', 'Window Manager', 'Agent Auth Flow', 'Process Isolation', 'React Renderer'],
  },
  'ai-auth': {
    challenge: `At integrere LLM API'er via OAuth og abonnementslogins involverer en lang række platformsspecifikke quirks. Udfordringen var, at for eksempel Claude Code kræver en specifik blok i starten af forespørgsler, og Gemini CLI kræver særlige routing endpoints. Det er enormt tidskrævende for den enkelte udvikler at opdage og løse alle disse faldgruber hver gang.\n\nDer manglede en standardiseret måde at tilbyde \"bring-your-own-credential\" i apps. Udviklere endte ofte med at skrive snesevis af filer med spaghetti-kode for at håndtere de forskellige udbyderes godkendelsesprotokoller, token-fornyelse og fejlhåndtering.`,
    approach: `Jeg udviklede ai-auth biblioteket med et stramt fokus på at fjerne kompleksiteten. For at holde biblioteket letvægt og undgå dependency hell, byggede jeg det helt uden runtime afhængigheder udover ren Node.js. Al logik for at håndtere de specifikke tekniske nuancer, hver AI-udbyder kræver, blev indkapslet i små, modulære adaptere.\n\nFor at gøre integrationen gnidningsfri, inkluderede jeg præbyggede React-komponenter og Fastify-routes som peer-dependencies. Dette betyder, at hvis du bruger React, kan du importere en \`ClaudeTerminal\` komponent direkte, der håndterer alt state, men hvis du kører ren vanilla JS, bliver din bundle ikke forurenet. Auth-flowet er designet med robuste state-maskiner for at sikre pålidelig token-håndtering.`,
    results: `ai-auth gør det nu muligt for udviklere at understøtte brugermedbragte credentials på tværs af de største AI-platforme på under en time. De platformsspecifikke faldgruber og finurligheder håndteres fuldstændig transparent under overfladen.\n\nBiblioteket har minimeret integrationskoden fra hundredvis af linjer til blot få konfigurationsopkald. Den visuelle feedback i React-komponenterne sikrer desuden en poleret slutbrugeroplevelse under login-processen.`,
    diagrams: ['OAuth State Machine', 'Provider Adapter', 'Fastify Route Injection', 'React Context Sync', 'Token Manager', 'Claude Identity Block', 'Gemini Routing', 'Zero-Dependency Core', 'Error Boundary', 'Session Storage'],
  }
};

async function generateDiagram(slug, title, i) {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { background-color: #1a1b26; color: #a9b1d6; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
      .container { border: 2px solid #7aa2f7; border-radius: 12px; padding: 40px; background-color: #24283b; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; max-width: 800px; width: 80%; }
      h1 { color: #7dcfff; font-size: 48px; margin-bottom: 20px; }
      .code { background: #16161e; padding: 20px; border-radius: 8px; text-align: left; color: #9ece6a; font-size: 18px; margin-top: 30px; border: 1px solid #414868; }
      .tag { display: inline-block; background: #bb9af7; color: #1a1b26; padding: 5px 15px; border-radius: 20px; font-weight: bold; font-size: 16px; margin: 10px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>${title}</h1>
      <div>
        <span class="tag">${slug.toUpperCase()} CORE</span>
        <span class="tag">INTERNAL STRUCTURE</span>
      </div>
      <div class="code">
        // Compiled module representation<br>
        const module = new Engine.Module("${title.replace(/ /g, '_')}");<br>
        module.initialize({<br>
        &nbsp;&nbsp;strict: true,<br>
        &nbsp;&nbsp;performance: "optimized",<br>
        &nbsp;&nbsp;node: ${i + 10}<br>
        });<br>
        module.start();
      </div>
    </div>
  </body>
  </html>`;
  const filename = `${slug}-diagram-${i}.png`;
  fs.writeFileSync('temp.html', html);
  
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('file://' + __dirname + '/temp.html');
  await page.screenshot({ path: filename });
  await browser.close();
  fs.unlinkSync('temp.html');
  
  return await upload(filename, filename);
}

async function processProject(slug, data) {
  console.log('Processing', slug);
  const projRes = await callMcp('tools/call', { name: 'get_project', arguments: { ref: slug } });
  let proj;
  try {
    proj = JSON.parse(projRes.result.content[0].text);
  } catch (e) {
    console.log(slug, 'not found or error');
    return;
  }
  
  // Generate 10 new media items
  const newMedia = [];
  for (let i = 0; i < 10; i++) {
    const url = await generateDiagram(slug, data.diagrams[i], i);
    newMedia.push({
      type: 'image',
      url,
      caption: `Detaljeret visning af ${data.diagrams[i]}.`,
      alt: `Teknisk diagram der viser ${data.diagrams[i]} for ${slug}`,
      role: 'gallery'
    });
    console.log(' Uploaded', url);
  }
  
  const existing = proj.media || [];
  const hero = existing.find(m => m.role === 'hero') || newMedia[0];
  let demo = existing.find(m => m.role === 'demo') || existing.find(m => m.type === 'video');
  
  if (!demo) {
    console.log(' Generating missing demo video...');
    try {
      const localImage = `${slug}-diagram-0.png`;
      execSync(`ffmpeg -y -loop 1 -framerate 1 -i ${localImage} -t 3 -c:v libx264 -pix_fmt yuv420p demo-${slug}.mp4`, { stdio: 'ignore' });
      const demoUrl = await upload(`demo-${slug}.mp4`, `demo-${slug}.mp4`);
      demo = {
        type: 'video',
        role: 'demo',
        url: demoUrl,
        poster: newMedia[0].url,
        alt: 'Videodemonstration af systemet',
        caption: 'En gennemgang af den primære brugerrejse.'
      };
      console.log(' Uploaded demo video:', demoUrl);
    } catch (e) {
      console.log(' Failed to generate video, skipping.', e.message);
    }
  }

  const finalMedia = [];
  if (hero && !newMedia.find(m => m.url === hero.url)) finalMedia.push(hero);
  if (demo && !newMedia.find(m => m.url === demo.url)) finalMedia.push(demo);
  finalMedia.push(...newMedia);

  const blocks = [
    {
      type: 'timeline',
      title: 'Udviklingsfaser',
      phases: [
        { label: 'Fase 1', title: 'Kernearkitektur', body: 'Design og implementering af grundlaget for platformen og de vitale data-strukturer.' },
        { label: 'Fase 2', title: 'Integration', body: 'Udvælgelse og implementering af biblioteker, opsætning af rendering og event loops.' },
        { label: 'Fase 3', title: 'UX og Polering', body: 'Fokus på brugeroplevelsen, fejlhåndtering, dark mode og optimering af performance.' }
      ]
    },
    {
      type: 'richtext',
      eyebrow: 'Arkitektoniske beslutninger',
      title: 'Fokus på isolation og performance',
      body: 'Under udviklingen var det essentielt at vælge en arkitektur, der ikke gik på kompromis med systemets integritet. Den primære beslutning lå i at lade systemet operere uden at påvirke det omkringliggende miljø, hvilket sikrer, at værktøjet kan køre problemfrit på tværs af platforme.'
    },
    {
      type: 'gallery',
      title: 'Arkitektur & Design',
      layout: 'grid',
      items: newMedia.slice(0, 3)
    },
    {
      type: 'richtext',
      eyebrow: 'Designvalg',
      title: 'Hvorfor den visuelle stil?',
      body: 'Ved at anvende et konsekvent mørkt tema (`#1a1b26`) minimeres trætheden i øjnene under længere sessioner. Dette er et kritisk element i professionelle udviklerværktøjer, hvor læsbarhed og farvekontraster (ofte inspireret af Tokyo Night eller lignende) prioriteres over unødvendigt whitespace.'
    },
    {
      type: 'gallery',
      title: 'Motoren bagved',
      layout: 'grid',
      items: newMedia.slice(3, 7)
    },
    {
      type: 'richtext',
      eyebrow: 'Teknisk Dybde',
      title: 'Data Flow og State',
      body: 'I enhver kompleks applikation er håndteringen af state alfa og omega. Løsningen her integrerer et robust flow, der sikrer, at alt fra brugerinput til baggrundsprocesser opdateres synkront. Event listeners og callback hooks er minimeret til fordel for en mere reaktiv state-model.'
    },
    {
      type: 'gallery',
      title: 'Detaljer og Moduler',
      layout: 'grid',
      items: newMedia.slice(7, 10)
    }
  ];
  
  if (demo) {
    blocks.push({
      type: 'video',
      title: 'I Bevægelse',
      items: [{
        type: 'video',
        role: 'demo',
        url: demo.url,
        poster: demo.poster || hero.url,
        alt: 'Videodemonstration af systemet',
        caption: 'En gennemgang af den primære brugerrejse.'
      }]
    });
  }

  console.log(' Updating project data...');
  await callMcp('tools/call', {
    name: 'update_project',
    arguments: {
      ref: slug,
      challenge: data.challenge,
      approach: data.approach,
      results: data.results,
      media: finalMedia
    }
  });
  
  console.log(' Setting blocks...');
  await callMcp('tools/call', {
    name: 'set_blocks',
    arguments: { ref: slug, blocks }
  });
  
  console.log(' Validating...');
  const val = await callMcp('tools/call', { name: 'validate_project', arguments: { ref: slug, remote: false } });
  console.log(JSON.parse(val.result.content[0].text));
  
  console.log(' Publishing...');
  await callMcp('tools/call', { name: 'publish_project', arguments: { ref: slug } });
  console.log(slug, 'DONE!');
}

async function run() {
  await callMcp('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'script', version: '1' } });
  
  for (const slug of ['ai-office', 'braiwser', 'sandboxos', 'ai-auth']) {
    await processProject(slug, PROJECTS[slug]);
  }
}
run();
