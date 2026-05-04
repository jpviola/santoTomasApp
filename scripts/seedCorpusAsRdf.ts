/**
 * Script para cargar los artículos del corpus de la Summa en GraphDB como RDF
 * 
 * Uso: $env:GRAPHDB_ENDPOINT_URL='http://JPVIOLA-PC2026:7200/repositories/santoTomas'; npx tsx scripts/seedCorpusAsRdf.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ONTOLOGY_PREFIX = 'https://stotomas.ai/ontology/';
const SCHEMA = 'http://schema.org/';

interface CorpusArticle {
  id: string;
  title: string;
  citation: string;
  text: string;
  topics: string[];
}

function articleToTurtle(article: CorpusArticle): string {
  const escape = (s: string) => s.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  const id = `<${ONTOLOGY_PREFIX}${article.id}>`;
  
  let turtle = `${id} a <${ONTOLOGY_PREFIX}SummaArticle> ;\n`;
  turtle += `    <${SCHEMA}name> "${escape(article.title)}" ;\n`;
  turtle += `    <${ONTOLOGY_PREFIX}citation> "${escape(article.citation)}" ;\n`;
  turtle += `    <${ONTOLOGY_PREFIX}text> "${escape(article.text)}"`;
  
  if (article.topics.length > 0) {
    const topics = article.topics
      .map(t => t.replace('st:', ''))
      .map(t => `<${ONTOLOGY_PREFIX}${t}>`)
      .join(', ');
    turtle += ` ;\n    <${ONTOLOGY_PREFIX}hasTopic> ${topics}`;
  }
  
  turtle += ' .\n\n';
  return turtle;
}

async function main() {
  const endpoint = process.env.GRAPHDB_ENDPOINT_URL;
  if (!endpoint) {
    console.error('Error: GRAPHDB_ENDPOINT_URL no está configurado');
    process.exit(1);
  }

  console.log(`Cargando corpus en: ${endpoint}`);

  const corpusPath = join(__dirname, '../src/data/corpus/summa-sample.json');
  const corpusRaw = readFileSync(corpusPath, 'utf-8');
  const articles: CorpusArticle[] = JSON.parse(corpusRaw);

  let turtle = `@prefix st: <${ONTOLOGY_PREFIX}> .\n@prefix schema: <${SCHEMA}> .\n@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\n`;
  turtle += `# ============================================\n`;
  turtle += `# Corpus de la Summa Theologiae\n`;
  turtle += `# Artículos de Tomás de Aquino\n`;
  turtle += `# ============================================\n\n`;

  for (const article of articles) {
    turtle += `# ${article.citation}\n`;
    turtle += articleToTurtle(article);
  }

  const outputPath = join(__dirname, 'corpus-seed.ttl');
  writeFileSync(outputPath, turtle, 'utf-8');
  
  console.log(`Archivo Turtle generado: ${outputPath}`);
  console.log(`Total de artículos: ${articles.length}`);

  console.log('\nSubiendo a GraphDB...');
  
  const content = readFileSync(outputPath, 'utf-8');
  const response = await fetch(`${endpoint}/statements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-turtle' },
    body: content,
  });

  if (response.status === 204) {
    console.log('✅ Corpus cargado exitosamente en GraphDB');
  } else {
    const body = await response.text();
    console.error(`❌ Error al cargar: ${response.status}`);
    console.error(body);
    process.exit(1);
  }
}

main().catch(console.error);
