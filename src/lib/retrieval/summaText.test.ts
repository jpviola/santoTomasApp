import { describe, expect, it } from "vitest";
import {
  buildArticleUrl,
  decodeEntities,
  extractSummaArticle,
  formatStCitation,
  parseStCitation,
  stSourceId,
  truncateAtSentence,
} from "@/lib/retrieval/summaText";

describe("parseStCitation", () => {
  it.each([
    ["ST I-II, q.94, a.2", "ST I-II, q.94, a.2"],
    ["S.Th. II-II q. 58 a. 1", "ST II-II, q.58, a.1"],
    ["Ia-IIae q.90 art.4", "ST I-II, q.90, a.4"],
    ["Summa Theologiae Ia IIae, q. 3, a. 8", "ST I-II, q.3, a.8"],
    ["I, q.2, a.3, ad 1", "ST I, q.2, a.3"],
    ["ST III, q.75, a.4", "ST III, q.75, a.4"],
    ["IIa-IIae, q.40, a.1", "ST II-II, q.40, a.1"],
  ])("parses %s", (input, expected) => {
    const parsed = parseStCitation(input);
    expect(parsed).not.toBeNull();
    expect(formatStCitation(parsed!)).toBe(expected);
  });

  it("distinguishes I-II from III", () => {
    expect(parseStCitation("ST I-II, q.1, a.1")?.part).toBe("I-II");
    expect(parseStCitation("ST III, q.1, a.1")?.part).toBe("III");
  });

  it.each(["SCG I, c.7", "ST I, q.2", "ST I-II, q.200, a.1", "De veritate, q.1, a.1", "ST I, q.2, a.0"])(
    "rejects %s",
    (input) => {
      expect(parseStCitation(input)).toBeNull();
    },
  );

  it("builds stable ids and language-specific urls", () => {
    const c = parseStCitation("ST I-II, q.94, a.2")!;
    expect(stSourceId(c)).toBe("st-i-ii-q94-a2");
    expect(buildArticleUrl(c, "en")).toBe("https://www.newadvent.org/summa/2094.htm#article2");
    expect(buildArticleUrl(c, "es")).toBe("https://hjg.com.ar/sumat/b/c94.html");
    expect(buildArticleUrl(c, "la")).toBe("https://www.corpusthomisticum.org/sth2094.html");
  });
});

describe("decodeEntities", () => {
  it("decodes numeric, named and accented entities", () => {
    expect(decodeEntities("Tom&aacute;s &amp; I&ordf;-IIae &#169; Theologi&aelig;")).toBe("Tomás & Iª-IIae © Theologiæ");
  });
});

describe("truncateAtSentence", () => {
  it("cuts at the last sentence boundary and marks the omission", () => {
    const text = "First sentence here. Second sentence is longer than the limit allows.";
    expect(truncateAtSentence(text, 35)).toBe("First sentence here. […]");
  });

  it("leaves short text untouched", () => {
    expect(truncateAtSentence("Short.", 40)).toBe("Short.");
  });
});

// Fragmentos con la misma estructura que las páginas reales de cada sitio.
const NEW_ADVENT = `
<h2 id="article1">Article 1. Whether the natural law is a habit?</h2>
<p>Objection 1. It would seem that the natural law is a habit.</p>
<p>I answer that, A thing may be called a habit in two ways, properly and essentially.</p>
<p>Reply to Objection 1. The Philosopher proposes there to discover the genus of virtue.</p>
<h2 id="article2">Article 2. Whether the natural law contains several precepts, or only one?</h2>
<p>Objection 1. It would seem that the natural law contains, not several precepts, but one only.</p>
<p>On the contrary, The precepts of the natural law in man stand in relation to practical matters.</p>
<p>I answer that, As stated above, the precepts of the natural law are to the practical reason what the first principles of demonstrations are to the speculative reason.</p>
<p>Reply to Objection 1. All these precepts of the law of nature have the character of one natural law.</p>
<p>The Summa Theologi&aelig; of St. Thomas Aquinas, Second and Revised Edition, 1920</p>`;

const HJG = `
<p><b>Artículo 1</b>: La ley natural, ¿es un hábito? <a>lat</a></p>
<p>Respondo: El hábito puede entenderse de dos maneras, en sentido propio y esencial.</p>
<p>A las objeciones: 1. El Filósofo trata de establecer la nota genérica de la virtud.</p>
<p><b>Artículo 2</b>: La ley natural, ¿comprende muchos preceptos o uno solamente? <a>lat</a></p>
<p>Contra esto: está que los preceptos de la ley natural son en el hombre.</p>
<p>Respondo: Como ya dijimos, los principios de la ley natural son en el orden práctico lo que los primeros principios de la demostración en el orden especulativo.</p>
<p>A las objeciones: 1. Todos estos preceptos de la ley natural constituyen una ley natural única.</p>
<p>Suma Teológica de Santo Tomás de Aquino &bull; hjg.com.ar</p>`;

const CORPUS_THOMISTICUM = `
<p>Articulus 1 [37580] I&ordf;-IIae q. 94 a. 1 arg. 1 Ad primum sic proceditur. Videtur quod lex naturalis sit habitus.</p>
<p>[37583] I&ordf;-IIae q. 94 a. 1 co. Respondeo dicendum quod aliquid potest dici esse habitus dupliciter, proprie et essentialiter.</p>
<p>[37584] I&ordf;-IIae q. 94 a. 1 ad 1 Ad primum ergo dicendum quod philosophus intendit ibi investigare genus virtutis.</p>
<p>Articulus 2 [37588] I&ordf;-IIae q. 94 a. 2 arg. 1 Ad secundum sic proceditur. Videtur quod lex naturalis non contineat plura praecepta.</p>
<p>[37592] I&ordf;-IIae q. 94 a. 2 co. Respondeo dicendum quod, sicut supra dictum est, praecepta legis naturae hoc modo se habent ad rationem practicam, sicut principia prima demonstrationum.</p>
<p>[37593] I&ordf;-IIae q. 94 a. 2 ad 1 Ad primum ergo dicendum quod omnia ista praecepta legis naturae habent rationem unius legis.</p>
<p>&copy; 2019 Fundaci&oacute;n Tom&aacute;s de Aquino</p>`;

describe("extractSummaArticle", () => {
  it("extracts the English title and respondeo from New Advent", () => {
    const result = extractSummaArticle(NEW_ADVENT, 2, "en");
    expect(result?.title).toBe("Whether the natural law contains several precepts, or only one?");
    expect(result?.text).toMatch(/^I answer that, As stated above/);
    expect(result?.text).not.toContain("Reply to Objection");
  });

  it("extracts the Spanish title and respondeo from hjg.com.ar (marker with a space before the colon)", () => {
    const result = extractSummaArticle(HJG, 2, "es");
    expect(result?.title).toBe("La ley natural, ¿comprende muchos preceptos o uno solamente?");
    expect(result?.text).toMatch(/^Respondo: Como ya dijimos/);
    expect(result?.text).not.toContain("A las objeciones");
  });

  it("extracts the Latin respondeo from Corpus Thomisticum without reference labels", () => {
    const result = extractSummaArticle(CORPUS_THOMISTICUM, 2, "la");
    expect(result?.text).toMatch(/^Respondeo dicendum quod, sicut supra dictum est/);
    expect(result?.text).not.toMatch(/\[\d+\]|q\. 94 a\. 2 co\./);
    expect(result?.text).not.toContain("Ad primum");
  });

  it("returns null for an article that does not exist", () => {
    expect(extractSummaArticle(NEW_ADVENT, 7, "en")).toBeNull();
    expect(extractSummaArticle(HJG, 7, "es")).toBeNull();
    expect(extractSummaArticle(CORPUS_THOMISTICUM, 7, "la")).toBeNull();
  });

  it("does not confuse article 1 with article 10+ in Latin", () => {
    const html = `Articulus 10 Respondeo dicendum quod decimus articulus loquitur de alia re omnino diversa. Ad primum ergo.`;
    expect(extractSummaArticle(html, 1, "la")).toBeNull();
  });
});
