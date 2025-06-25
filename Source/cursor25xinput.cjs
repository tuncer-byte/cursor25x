// cursor25xinput.cjs - CURSOR25X Interactive Input Handler
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('🚀 CURSOR25X prompt: ', (answer) => {
    console.log(answer);
    rl.close();
});
