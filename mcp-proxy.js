const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  try {
    const response = await fetch('https://mast3kmedia.dk/mcp', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 1aOz7YyqXiyE8q72AlErqatckz9I_bqUNM4rqgUaHvw',
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: line
    });

    const text = await response.text();
    console.error('DEBUG:', text);
    const lines = text.split('\n');
    for (const l of lines) {
      if (l.startsWith('data: ')) {
        console.log(l.slice(6));
      }
    }
  } catch (err) {
    console.error(err);
  }
});
