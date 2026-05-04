/**
 * Script para cargar la ontología inicial en GraphDB
 * 
 * Uso: npx tsx scripts/seedGraphDb.ts
 * 
 * Requiere: GRAPHDB_ENDPOINT_URL configurado en .env
 * Ejemplo: GRAPHDB_ENDPOINT_URL=http://JPVIOLA-PC2026:7200/repositories/santoTomas
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ONTOLOGY_PREFIX = 'https://stotomas.ai/ontology/';
const SCHEMA = 'http://schema.org/';

interface OntologyTerm {
  id: string;
  name: string;
  nameEs: string;
  descriptionEs: string;
  descriptionEn: string;
  broaderThan?: string;
  narrowerThan?: string[];
  relatedTo?: string[];
}

interface SummaArticle {
  id: string;
  title: string;
  citation: string;
  text: string;
  topics: string[];
}

const TERMS: OntologyTerm[] = [
  {
    id: 'Intellectus',
    name: 'Intellectus',
    nameEs: 'Intelecto',
    descriptionEs: 'Potencia del alma por la cual se entiende la verdad de las cosas. Es la facultad cognoscitiva inmaterial que alcanza la esencia de las cosas.',
    descriptionEn: 'The power of the soul by which the truth of things is understood. The immaterial cognitive faculty that grasps the essence of things.',
    narrowerThan: ['Anima'],
    relatedTo: ['Voluntas', 'Ratio', 'Veritas'],
  },
  {
    id: 'Anima',
    name: 'Anima',
    nameEs: 'Alma',
    descriptionEs: 'Primer principio de vida en los seres vivos. Forma sustancial del cuerpo natural que tiene vida en potencia.',
    descriptionEn: 'The first principle of life in living beings. The substantial form of a natural body that has life in potentiality.',
    relatedTo: ['Intellectus', 'Voluntas', 'Potentia', 'Actus'],
  },
  {
    id: 'Voluntas',
    name: 'Voluntas',
    nameEs: 'Voluntad',
    descriptionEs: 'Apetito racional que tiende al bien apprehendido por el intelecto. Es la facultad por la que el hombre se mueve libremente hacia un fin.',
    descriptionEn: 'Rational appetite that tends toward the good apprehended by the intellect. The faculty by which man moves freely toward an end.',
    relatedTo: ['Intellectus', 'LibertumArbitrium', 'Bonum'],
  },
  {
    id: 'Ratio',
    name: 'Ratio',
    nameEs: 'Razón',
    descriptionEs: 'Potencia discursiva del alma que procede de lo conocido a lo desconocido. Distingue del intelecto que capta inmediatamente la verdad.',
    descriptionEn: 'The discursive power of the soul that proceeds from the known to the unknown. Distinguished from intellect which immediately grasps truth.',
    narrowerThan: ['Intellectus'],
    relatedTo: ['Intellectus', 'Veritas', 'Scientia'],
  },
  {
    id: 'Epistemologia',
    name: 'Epistemologia',
    nameEs: 'Teoría del conocimiento',
    descriptionEs: 'Doctrina tomista sobre el origen y naturaleza del conocimiento humano. El conocimiento comienza por los sentidos y se perfecciona por el intelecto agente.',
    descriptionEn: 'Thomistic doctrine on the origin and nature of human knowledge. Knowledge begins with the senses and is perfected by the agent intellect.',
    broaderThan: 'Philosophia',
    relatedTo: ['Intellectus', 'Sensus', 'Species', 'Veritas'],
  },
  {
    id: 'Hilemorfismo',
    name: 'Hilemorfismo',
    nameEs: 'Hilemorfismo',
    descriptionEs: 'Doctrina que sostiene que toda sustancia corpórea se compone de materia (hyle) y forma (morphe). La forma da el ser específico a la materia.',
    descriptionEn: 'Doctrine holding that every corporeal substance is composed of matter (hyle) and form (morphe). Form gives specific being to matter.',
    broaderThan: 'Metaphysica',
    relatedTo: ['Materia', 'Forma', 'Actus', 'Potentia', 'Substantia'],
  },
  {
    id: 'Veritas',
    name: 'Veritas',
    nameEs: 'Verdad',
    descriptionEs: 'Adecuación del intelecto y la cosa. La verdad se encuentra en el intelecto que compone y divide, no en los sentidos.',
    descriptionEn: 'Adequation of intellect and thing. Truth is found in the intellect that composes and divides, not in the senses.',
    relatedTo: ['Intellectus', 'Ratio', 'Bonum', 'Ens'],
  },
  {
    id: 'Bonum',
    name: 'Bonum',
    nameEs: 'Bien',
    descriptionEs: 'Lo que todas las cosas apetecen. El bien es convertible con el ser pero añade la razón de apetecible.',
    descriptionEn: 'That which all things desire. The good is convertible with being but adds the notion of desirability.',
    relatedTo: ['Voluntas', 'Veritas', 'Ens', 'Finis'],
  },
  {
    id: 'Ens',
    name: 'Ens',
    nameEs: 'Ser',
    descriptionEs: 'Lo primero que cae en la apprehensión del intelecto. El ente se dice de muchas maneras pero se reduce a la sustancia y el accidente.',
    descriptionEn: 'The first thing that falls under the apprehension of the intellect. Being is said in many ways but is reduced to substance and accident.',
    broaderThan: 'Metaphysica',
    relatedTo: ['Essentia', 'Existere', 'Veritas', 'Bonum', 'Substantia'],
  },
  {
    id: 'Essentia',
    name: 'Essentia',
    nameEs: 'Esencia',
    descriptionEs: 'Lo por lo que una cosa es lo que es. En las criaturas se distingue realmente de la existencia, excepto en Dios.',
    descriptionEn: 'That by which a thing is what it is. In creatures it is really distinct from existence, except in God.',
    relatedTo: ['Ens', 'Existere', 'Natura', 'Substantia'],
  },
  {
    id: 'Existere',
    name: 'Existere',
    nameEs: 'Existencia',
    descriptionEs: 'Acto de ser. El actus essendi es el acto más perfecto de todos, pues sin él ninguna cosa puede existir.',
    descriptionEn: 'The act of being. The actus essendi is the most perfect of all acts, for without it no thing can exist.',
    relatedTo: ['Essentia', 'Ens', 'Actus'],
  },
  {
    id: 'Actus',
    name: 'Actus',
    nameEs: 'Acto',
    descriptionEs: 'Perfección de un ser en cuanto está en acto. Se opone a la potencia como lo perfecto a lo imperfecto.',
    descriptionEn: 'The perfection of a being insofar as it is in act. Opposed to potency as the perfect to the imperfect.',
    broaderThan: 'Metaphysica',
    relatedTo: ['Potentia', 'Essentia', 'Existere', 'Forma'],
  },
  {
    id: 'Potentia',
    name: 'Potentia',
    nameEs: 'Potencia',
    descriptionEs: 'Capacidad o aptitud de un ser para recibir una perfección. La potencia se reduce a acto por la acción de un agente.',
    descriptionEn: 'The capacity or aptitude of a being to receive a perfection. Potency is reduced to act by the action of an agent.',
    broaderThan: 'Metaphysica',
    relatedTo: ['Actus', 'Materia', 'Forma', 'Anima'],
  },
  {
    id: 'Substantia',
    name: 'Substantia',
    nameEs: 'Sustancia',
    descriptionEs: 'Lo que existe en sí y no en otro como en sujeto. Primera de las diez categorías aristotélicas.',
    descriptionEn: 'That which exists in itself and not in another as in a subject. First of the ten Aristotelian categories.',
    broaderThan: 'Metaphysica',
    relatedTo: ['Ens', 'Accidens', 'Essentia', 'Materia', 'Forma'],
  },
  {
    id: 'Accidens',
    name: 'Accidens',
    nameEs: 'Accidente',
    descriptionEs: 'Lo que existe en otro como en sujeto. Las nueve categorías restantes después de la sustancia.',
    descriptionEn: 'That which exists in another as in a subject. The nine remaining categories after substance.',
    relatedTo: ['Substantia', 'Ens', 'Forma'],
  },
  {
    id: 'Materia',
    name: 'Materia',
    nameEs: 'Materia',
    descriptionEs: 'Principio potencial de la sustancia corpórea. La materia prima es pura potencia sin ninguna determinación formal.',
    descriptionEn: 'The potential principle of corporeal substance. Prime matter is pure potency without any formal determination.',
    broaderThan: 'Hilemorfismo',
    relatedTo: ['Forma', 'Potentia', 'Actus', 'Hilemorfismo'],
  },
  {
    id: 'Forma',
    name: 'Forma',
    nameEs: 'Forma',
    descriptionEs: 'Principio actual de la sustancia corpórea. La forma sustancial da el ser específico a la materia.',
    descriptionEn: 'The actual principle of corporeal substance. Substantial form gives specific being to matter.',
    broaderThan: 'Hilemorfismo',
    relatedTo: ['Materia', 'Actus', 'Essentia', 'Substantia'],
  },
  {
    id: 'Philosophia',
    name: 'Philosophia',
    nameEs: 'Filosofía',
    descriptionEs: 'Ciencia de todas las cosas por sus causas últimas. Se divide en teórica, práctica y productiva.',
    descriptionEn: 'The science of all things through their ultimate causes. Divided into theoretical, practical, and productive.',
    relatedTo: ['Theologia', 'Scientia', 'Metaphysica'],
  },
  {
    id: 'Theologia',
    name: 'Theologia',
    nameEs: 'Teología',
    descriptionEs: 'Ciencia que trata de Dios y de las cosas divinas. La teología sagrada es ciencia más cierta que la filosofía.',
    descriptionEn: 'The science that treats of God and divine things. Sacred theology is a science more certain than philosophy.',
    relatedTo: ['Philosophia', 'Deus', 'Fides', 'Revelatio'],
  },
  {
    id: 'Deus',
    name: 'Deus',
    nameEs: 'Dios',
    descriptionEs: 'Primer motor inmóvil, causa primera, ser necesario. En Dios la esencia y la existencia son idénticas.',
    descriptionEn: 'First unmoved mover, first cause, necessary being. In God, essence and existence are identical.',
    broaderThan: 'Theologia',
    relatedTo: ['Ens', 'Essentia', 'Existere', 'Bonum', 'Veritas'],
  },
  {
    id: 'Metaphysica',
    name: 'Metaphysica',
    nameEs: 'Metafísica',
    descriptionEs: 'Ciencia que considera el ser en cuanto ser y las propiedades que le siguen. Es la filosofía primera.',
    descriptionEn: 'The science that considers being as being and the properties that follow from it. It is first philosophy.',
    narrowerThan: ['Philosophia'],
    relatedTo: ['Ens', 'Substantia', 'Actus', 'Potentia', 'Causa'],
  },
  {
    id: 'Causa',
    name: 'Causa',
    nameEs: 'Causa',
    descriptionEs: 'Principio del cual depende el ser de otra cosa. Hay cuatro causas: material, formal, eficiente y final.',
    descriptionEn: 'A principle on which the being of another thing depends. There are four causes: material, formal, efficient, and final.',
    broaderThan: 'Metaphysica',
    relatedTo: ['Effectus', 'Metaphysica', 'Deus'],
  },
  {
    id: 'Finis',
    name: 'Finis',
    nameEs: 'Fin',
    descriptionEs: 'Aquello por lo cual se hace algo. La causa final es la causa de las causas, pues mueve a la causa eficiente.',
    descriptionEn: 'That for the sake of which something is done. The final cause is the cause of causes, for it moves the efficient cause.',
    relatedTo: ['Causa', 'Voluntas', 'Bonum', 'Beatitudo'],
  },
  {
    id: 'Beatitudo',
    name: 'Beatitudo',
    nameEs: 'Bienaventuranza',
    descriptionEs: 'Fin último del hombre. La bienaventuranza perfecta consiste en la visión beatífica de Dios.',
    descriptionEn: 'The ultimate end of man. Perfect happiness consists in the beatific vision of God.',
    relatedTo: ['Finis', 'Deus', 'Voluntas', 'Bonum'],
  },
  {
    id: 'Virtus',
    name: 'Virtus',
    nameEs: 'Virtud',
    descriptionEs: 'Buena cualidad de la mente por la que se vive rectamente. Las virtudes cardinales son prudencia, justicia, fortaleza y templanza.',
    descriptionEn: 'A good quality of the mind by which one lives rightly. The cardinal virtues are prudence, justice, fortitude, and temperance.',
    relatedTo: ['Bonum', 'Voluntas', 'Habitus', 'Ethica'],
  },
  {
    id: 'Habitus',
    name: 'Habitus',
    nameEs: 'Hábito',
    descriptionEs: 'Cualidad difícil de mudar que dispone bien o mal al sujeto. La virtud es un hábito operativo bueno.',
    descriptionEn: 'A quality difficult to change that disposes the subject well or ill. Virtue is a good operative habit.',
    relatedTo: ['Virtus', 'Potentia', 'Actus'],
  },
  {
    id: 'Fides',
    name: 'Fides',
    nameEs: 'Fe',
    descriptionEs: 'Virtud teologal por la cual creemos en Dios y en las verdades que Él ha revelado.',
    descriptionEn: 'Theological virtue by which we believe in God and in the truths He has revealed.',
    relatedTo: ['Theologia', 'Revelatio', 'Virtus', 'Deus'],
  },
  {
    id: 'Revelatio',
    name: 'Revelatio',
    nameEs: 'Revelación',
    descriptionEs: 'Manifestación de verdades sobrenaturales que superan la capacidad natural del intelecto humano.',
    descriptionEn: 'Manifestation of supernatural truths that surpass the natural capacity of the human intellect.',
    relatedTo: ['Fides', 'Theologia', 'Deus'],
  },
  {
    id: 'Scientia',
    name: 'Scientia',
    nameEs: 'Ciencia',
    descriptionEs: 'Conocimiento cierto por las causas. Hábito intelectual por el cual conocemos las cosas por sus causas.',
    descriptionEn: 'Certain knowledge through causes. Intellectual habit by which we know things through their causes.',
    relatedTo: ['Ratio', 'Causa', 'Intellectus', 'Veritas'],
  },
  {
    id: 'Sensus',
    name: 'Sensus',
    nameEs: 'Sentido',
    descriptionEs: 'Potencia del alma que conoce los objetos sensibles. Hay cinco sentidos exteriores y cuatro interiores.',
    descriptionEn: 'Power of the soul that knows sensible objects. There are five exterior senses and four interior senses.',
    relatedTo: ['Epistemologia', 'Anima', 'Intellectus', 'Species'],
  },
  {
    id: 'Species',
    name: 'Species',
    nameEs: 'Especie inteligible',
    descriptionEs: 'Forma por la cual el intelecto conoce. La especie inteligible es el principio formal del acto de conocer.',
    descriptionEn: 'The form by which the intellect knows. The intelligible species is the formal principle of the act of knowing.',
    relatedTo: ['Intellectus', 'Epistemologia', 'Sensus', 'Veritas'],
  },
  {
    id: 'LibertumArbitrium',
    name: 'LibertumArbitrium',
    nameEs: 'Libre albedrío',
    descriptionEs: 'Facultad de elegir entre varios medios para alcanzar un fin. Presupone el conocimiento de la razón.',
    descriptionEn: 'The faculty of choosing among several means to attain an end. It presupposes the knowledge of reason.',
    relatedTo: ['Voluntas', 'Ratio', 'Intellectus'],
  },
  {
    id: 'Ethica',
    name: 'Ethica',
    nameEs: 'Ética',
    descriptionEs: 'Parte de la filosofía práctica que ordena los actos humanos al fin último mediante las virtudes.',
    descriptionEn: 'Part of practical philosophy that orders human acts to the ultimate end through virtues.',
    narrowerThan: ['Philosophia'],
    relatedTo: ['Virtus', 'Finis', 'Bonum', 'Voluntas'],
  },
];

function termToTurtle(term: OntologyTerm): string {
  const escape = (s: string) => s.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  const id = `<${ONTOLOGY_PREFIX}${term.id}>`;
  
  let turtle = `${id} a <${SCHEMA}DefinedTerm> ;\n`;
  turtle += `    <${SCHEMA}name> "${escape(term.name)}" ;\n`;
  turtle += `    <${ONTOLOGY_PREFIX}nameEs> "${escape(term.nameEs)}" ;\n`;
  turtle += `    <${SCHEMA}description> "${escape(term.descriptionEn)}" ;\n`;
  turtle += `    <${ONTOLOGY_PREFIX}descriptionEs> "${escape(term.descriptionEs)}"`;
  
  if (term.broaderThan) {
    turtle += ` ;\n    <${ONTOLOGY_PREFIX}broaderThan> <${ONTOLOGY_PREFIX}${term.broaderThan}>`;
  }
  
  if (term.narrowerThan && term.narrowerThan.length > 0) {
    const narrower = term.narrowerThan.map(n => `<${ONTOLOGY_PREFIX}${n}>`).join(', ');
    turtle += ` ;\n    <${ONTOLOGY_PREFIX}narrowerThan> ${narrower}`;
  }
  
  if (term.relatedTo && term.relatedTo.length > 0) {
    const related = term.relatedTo.map(r => `<${ONTOLOGY_PREFIX}${r}>`).join(', ');
    turtle += ` ;\n    <${ONTOLOGY_PREFIX}relatedTo> ${related}`;
  }
  
  turtle += ' .\n\n';
  return turtle;
}

function articleToTurtle(article: SummaArticle): string {
  const escape = (s: string) => s.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  const id = `<${ONTOLOGY_PREFIX}${article.id}>`;
  
  let turtle = `${id} a <${ONTOLOGY_PREFIX}SummaArticle> ;\n`;
  turtle += `    <${SCHEMA}name> "${escape(article.title)}" ;\n`;
  turtle += `    <${ONTOLOGY_PREFIX}citation> "${escape(article.citation)}" ;\n`;
  turtle += `    <${ONTOLOGY_PREFIX}text> "${escape(article.text)}"`;
  
  if (article.topics.length > 0) {
    const topics = article.topics.map(t => `<${ONTOLOGY_PREFIX}${t}>`).join(', ');
    turtle += ` ;\n    <${ONTOLOGY_PREFIX}hasTopic> ${topics}`;
  }
  
  turtle += ' .\n\n';
  return turtle;
}

async function main() {
  const endpoint = process.env.GRAPHDB_ENDPOINT_URL;
  if (!endpoint) {
    console.error('Error: GRAPHDB_ENDPOINT_URL no está configurado');
    console.error('Ejemplo: GRAPHDB_ENDPOINT_URL=http://JPVIOLA-PC2026:7200/repositories/santoTomas');
    process.exit(1);
  }

  console.log(`Conectando a GraphDB: ${endpoint}`);

  let turtle = `@prefix st: <${ONTOLOGY_PREFIX}> .\n@prefix schema: <${SCHEMA}> .\n@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\n`;

  turtle += '# ============================================\n';
  turtle += '# Ontología StoTomas AI - Conceptos Filosóficos\n';
  turtle += '# ============================================\n\n';

  for (const term of TERMS) {
    turtle += `# ${term.name} (${term.nameEs})\n`;
    turtle += termToTurtle(term);
  }

  try {
    const corpusPath = join(__dirname, '../src/data/corpus/summa-sample.json');
    const corpusRaw = readFileSync(corpusPath, 'utf-8');
    const articles: SummaArticle[] = JSON.parse(corpusRaw);

    turtle += '# ============================================\n';
    turtle += '# Artículos de la Summa Theologiae\n';
    turtle += '# ============================================\n\n';

    for (const article of articles) {
      turtle += `# ${article.citation}\n`;
      turtle += articleToTurtle(article);
    }
  } catch {
    console.log('Warning: No se encontró el corpus, seed solo con términos ontológicos');
  }

  const outputPath = join(__dirname, 'ontology-seed.ttl');
  writeFileSync(outputPath, turtle, 'utf-8');
  
  console.log(`\nArchivo Turtle generado: ${outputPath}`);
  console.log(`Total de términos: ${TERMS.length}`);
  console.log('\nSubiendo a GraphDB...');
  
  const ttlContent = readFileSync(outputPath, 'utf-8');
  const response = await fetch(`${endpoint}/statements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-turtle' },
    body: ttlContent,
  });

  if (response.status === 204) {
    console.log('✅ Ontología cargada exitosamente en GraphDB');
  } else {
    const body = await response.text();
    console.error(`❌ Error al cargar: ${response.status}`);
    console.error(body);
    process.exit(1);
  }

  console.log('\nImportación manual alternativa:');
  console.log(`1. Abre GraphDB Workbench en ${endpoint.replace('/repositories/', '/import#')}`);
  console.log('2. Ve a Import > User Data');
  console.log(`3. Sube el archivo: ${outputPath}`);
  console.log('4. Selecciona el repositorio correcto');
  console.log('5. Click en Import');
}

main().catch(console.error);
