/**
 * Test de integración de GraphDB + OntologyEngine
 * 
 * Uso: $env:GRAPHDB_ENDPOINT_URL='http://JPVIOLA-PC2026:7200/repositories/santoTomas'; npx tsx scripts/testGraphDbIntegration.ts
 */

import { getOntologyEngine } from '../src/lib/agents/OntologyEngine';
import { retrieveOntologyEnrichedSources } from '../src/lib/retrieval/ontologyRetriever';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ${GREEN}✓${RESET} ${label}`);
    passed++;
  } else {
    console.log(`  ${RED}✗${RESET} ${label}`);
    failed++;
  }
}

async function test1_FindRelevantTerms_Intellectus() {
  console.log(`\n${CYAN}Test 1: Buscar términos por "intelecto"${RESET}`);
  const terms = await getOntologyEngine().findRelevantTerms('intelecto');
  
  assert(terms.length > 0, `Encontró ${terms.length} términos`);
  
  const intellectus = terms.find(t => t.id.includes('Intellectus'));
  assert(!!intellectus, 'Encontró Intellectus');
  
  if (intellectus) {
    assert(intellectus.name.length > 0, `Nombre: "${intellectus.name}"`);
    assert(intellectus.description.length > 0, `Descripción tiene ${intellectus.description.length} caracteres`);
    assert(Array.isArray(intellectus.relatedTo), `Relaciones: ${intellectus.relatedTo?.length ?? 0} conceptos relacionados`);
  }
  
  console.log(`\n  Términos encontrados:`);
  terms.forEach(t => {
    console.log(`    - ${t.name} (${t.id})`);
  });
}

async function test2_FindRelevantTerms_Agenda() {
  console.log(`\n${CYAN}Test 2: Buscar términos por "alma"${RESET}`);
  const terms = await getOntologyEngine().findRelevantTerms('alma');
  
  assert(terms.length > 0, `Encontró ${terms.length} términos`);
  
  const anima = terms.find(t => t.id.includes('Anima'));
  assert(!!anima, 'Encontró Anima');
}

async function test3_GetArticlesByTopic() {
  console.log(`\n${CYAN}Test 3: Obtener artículos por tema Intellectus${RESET}`);
  const articles = await getOntologyEngine().getArticlesByTopic('Intellectus');
  
  assert(articles.length > 0, `Encontró ${articles.length} artículos`);
  
  if (articles.length > 0) {
    const first = articles[0];
    assert(!!first.title, `Título: "${first.title}"`);
    assert(!!first.citation, `Cita: "${first.citation}"`);
    assert(first.topics.length > 0, `Temas: ${first.topics.length} vinculados`);
  }
  
  console.log(`\n  Artículos sobre Intellectus:`);
  articles.forEach(a => {
    console.log(`    - ${a.citation}`);
  });
}

async function test4_GetArticlesByTopic_Anima() {
  console.log(`\n${CYAN}Test 4: Obtener artículos por tema Anima${RESET}`);
  const articles = await getOntologyEngine().getArticlesByTopic('Anima');
  
  assert(articles.length > 0, `Encontró ${articles.length} artículos`);
}

async function test5_FindRelatedConcepts() {
  console.log(`\n${CYAN}Test 5: Buscar conceptos relacionados con Intellectus${RESET}`);
  const related = await getOntologyEngine().findRelatedConcepts('https://stotomas.ai/ontology/Intellectus');
  
  assert(related.length > 0, `Encontró ${related.length} conceptos relacionados`);
  
  console.log(`\n  Conceptos relacionados:`);
  related.forEach(r => {
    console.log(`    - ${r.name}`);
  });
}

async function test6_OntologyRetriever_Question() {
  console.log(`\n${CYAN}Test 6: Retrieval enriquecido - "¿Qué es el intelecto?"${RESET}`);
  const sources = await retrieveOntologyEnrichedSources('¿Qué es el intelecto humano?');
  
  assert(sources.length > 0, `Encontró ${sources.length} fuentes`);
  
  console.log(`\n  Fuentes obtenidas:`);
  sources.forEach(s => {
    console.log(`    - [${s.citation}] ${s.title}`);
  });
}

async function test7_OntologyRetriever_Soul() {
  console.log(`\n${CYAN}Test 7: Retrieval enriquecido - "¿El alma es inmortal?"${RESET}`);
  const sources = await retrieveOntologyEnrichedSources('¿El alma es inmortal?');
  
  assert(sources.length > 0, `Encontró ${sources.length} fuentes`);
  
  console.log(`\n  Fuentes obtenidas:`);
  sources.forEach(s => {
    console.log(`    - [${s.citation}] ${s.title}`);
  });
}

async function test8_NoResults_GraphDB() {
  console.log(`\n${CYAN}Test 8: Búsqueda sin resultados - "quantum physics"${RESET}`);
  const terms = await getOntologyEngine().findRelevantTerms('quantum physics');
  
  assert(terms.length === 0, 'No encontró términos (correcto para tema no tomista)');
}

async function main() {
  const endpoint = process.env.GRAPHDB_ENDPOINT_URL || 'http://JPVIOLA-PC2026:7200/repositories/santoTomas';
  console.log(`${YELLOW}=============================================${RESET}`);
  console.log(`${YELLOW}  Test de integración GraphDB - StoTomas AI${RESET}`);
  console.log(`${YELLOW}  Endpoint: ${endpoint}${RESET}`);
  console.log(`${YELLOW}=============================================${RESET}`);
  
  try {
    await test1_FindRelevantTerms_Intellectus();
    await test2_FindRelevantTerms_Agenda();
    await test3_GetArticlesByTopic();
    await test4_GetArticlesByTopic_Anima();
    await test5_FindRelatedConcepts();
    await test6_OntologyRetriever_Question();
    await test7_OntologyRetriever_Soul();
    await test8_NoResults_GraphDB();
  } catch (error) {
    console.log(`\n${RED}ERROR FATAL: ${error instanceof Error ? error.message : String(error)}${RESET}`);
    process.exit(1);
  }
  
  console.log(`\n${YELLOW}=============================================${RESET}`);
  console.log(`${GREEN}  Pasaron: ${passed}${RESET}`);
  console.log(failed > 0 ? `${RED}  Fallaron: ${failed}${RESET}` : '');
  console.log(`${YELLOW}=============================================${RESET}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
