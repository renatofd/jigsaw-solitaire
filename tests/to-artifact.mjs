// Converte o build de arquivo único em fragmento (sem doctype/html/head/body) para o Artifact.
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync(process.argv[2], 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
const styles = (head.match(/<style[\s\S]*?<\/style>/g) ?? []).join('\n');
const scripts = (head.match(/<script[\s\S]*?<\/script>/g) ?? []).join('\n');
const out = `${title}\n<meta name="theme-color" content="#1d1838">\n${styles}\n${body}\n${scripts}\n`;
writeFileSync(process.argv[3], out);
console.log('bytes', out.length);
