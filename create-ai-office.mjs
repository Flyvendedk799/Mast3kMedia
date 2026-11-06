import { createProject, validateProject, publishProject, setBlocks } from './lib/casework.js';

async function run() {
  try {
    const draftId = await createProject({
      title: 'ai-office',
      slug: 'ai-office',
      category: 'Software',
      industry: 'AI',
      year: 2026,
      client: 'Mast3kMedia',
      role_scope: 'Full stack udvikling, TUI design, reverse engineering',
      deliverables: 'Node.js CLI app, process scanner, ASCII animation engine',
      services: 'Terminal UI, Open Source',
      description: 'En terminal-baseret monitorering der viser dine AI-agenter som små medarbejdere i et animeret ASCII-kontor.',
      long_description: 'Når du kører flere AI-agenter på tværs af projekter, mister du hurtigt overblikket over hvem der laver hvad. ai-office løser det ved at samle Claude Code, Cursor, Aider og andre i ét fælles overblik.',
      challenge: 'Problemet var, at agenter som Claude Code og Codex kører i separate terminaler. Der fandtes ingen samlet måde at se, hvilke agenter der var aktive, hvad de arbejdede på lige nu, og hvor meget CPU og hukommelse de brugte.',
      approach: 'Jeg byggede en lokal Node.js-app, der scanner processer via ps og PowerShell, og parrer dem med agenternes egne lokale sessionsfiler. For at gøre det sjovt byggede jeg en ASCII-renderingsmotor, hvor agenterne ankommer, arbejder ved deres skriveborde og tager kaffepauser, baseret på deres faktiske CPU-forbrug.',
      results: 'Resultatet er et open source-værktøj, der både fungerer som en praktisk procesmonitor og en myrefarm for AI-agenter. Den kører lokalt uden netværkskald og giver fuldt overblik over maskinens AI-arbejdsstyrke.',
      tags: ['CLI', 'ASCII', 'Node.js'],
      tech_stack: ['Node.js', 'TUI', 'AppleScript', 'PowerShell'],
      case_url: 'https://github.com/flyvendedk799/ai-office'
    });

    console.log('Created project:', draftId);

    const validation = await validateProject(draftId, { checkRemoteUrls: false });
    console.log('Validation:', JSON.stringify(validation, null, 2));

    await publishProject(draftId);
    console.log('Published!');
  } catch (err) {
    console.error(err);
  }
}

run();
