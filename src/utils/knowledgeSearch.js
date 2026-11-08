/**
 * RAG-Ready Knowledge Search Service
 * 
 * Pipeline Readiness:
 * Documents → Text Chunking → Embeddings → Vector Database → Semantic Retrieval → LLM → Grounded Answer
 * 
 * Provides keyword-based lexical retrieval with match rationale and snippet extraction
 * for the frontend demo stage.
 */

export function searchKnowledgeBase(query = '', articles = [], categoryFilter = 'ALL') {
  if (!Array.isArray(articles)) return [];

  // 1. Filter by category first if specified
  let pool = articles;
  if (categoryFilter && categoryFilter !== 'ALL') {
    pool = pool.filter((art) => art.category === categoryFilter);
  }

  const cleanQuery = query.trim().toLowerCase();

  // If no query, return all articles in pool with default excerpt
  if (!cleanQuery) {
    return pool.map((art) => ({
      article: art,
      score: 1.0,
      matchReason: 'Browsing all verified articles in category.',
      relevantExcerpt: art.shortDescription || art.summary || '',
    }));
  }

  // Tokenize query words (excluding common stop words)
  const stopWords = new Set(['the', 'and', 'or', 'to', 'in', 'on', 'a', 'is', 'it', 'for', 'of', 'my', 'i', 'do', 'how']);
  const tokens = cleanQuery
    .split(/[\s,.-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !stopWords.has(t));

  if (tokens.length === 0) {
    // If only stop words, do direct substring search
    tokens.push(cleanQuery);
  }

  const scoredResults = [];

  for (const art of pool) {
    let score = 0;
    const matchReasons = [];
    let matchedSnippet = '';

    const titleLower = (art.title || '').toLowerCase();
    const descLower = (art.shortDescription || art.summary || '').toLowerCase();
    const catLower = (art.category || '').toLowerCase();
    const tagsLower = Array.isArray(art.tags) ? art.tags.map((t) => t.toLowerCase()) : [];
    const instructionsLower = Array.isArray(art.troubleshootingInstructions)
      ? art.troubleshootingInstructions.join(' ').toLowerCase()
      : (art.content || '').toLowerCase();

    // Check full phrase match first
    if (titleLower.includes(cleanQuery)) {
      score += 25;
      matchReasons.push(`Direct title match for "${cleanQuery}"`);
    }

    if (descLower.includes(cleanQuery)) {
      score += 15;
      matchReasons.push('Direct description match');
    }

    // Token-by-token matching
    const matchedTags = [];
    for (const token of tokens) {
      if (titleLower.includes(token)) {
        score += 10;
        if (!matchReasons.some((r) => r.includes('title'))) {
          matchReasons.push(`Title contains "${token}"`);
        }
      }

      const foundTag = tagsLower.find((tag) => tag.includes(token));
      if (foundTag) {
        score += 8;
        if (!matchedTags.includes(foundTag)) matchedTags.push(foundTag);
      }

      if (descLower.includes(token)) {
        score += 5;
      }

      if (catLower.includes(token)) {
        score += 4;
      }

      if (instructionsLower.includes(token)) {
        score += 3;
        if (!matchedSnippet) {
          // Extract an excerpt containing this token
          const idx = instructionsLower.indexOf(token);
          const start = Math.max(0, idx - 40);
          const end = Math.min(instructionsLower.length, idx + 120);
          matchedSnippet = '...' + instructionsLower.substring(start, end).trim() + '...';
        }
      }
    }

    if (matchedTags.length > 0) {
      matchReasons.push(`Tags matched: [${matchedTags.slice(0, 3).join(', ')}]`);
    }

    // Only include articles that scored positively
    if (score > 0) {
      scoredResults.push({
        article: art,
        score,
        matchReason: matchReasons.length > 0 ? matchReasons.join(' • ') : `Matched relevant query terms.`,
        relevantExcerpt: matchedSnippet || art.shortDescription || art.summary || '',
      });
    }
  }

  // Sort results by relevance score descending
  return scoredResults.sort((a, b) => b.score - a.score);
}

/**
 * Helper to find the single best or top matching verified articles for a prompt/ticket
 */
export function findBestKnowledgeMatch(queryText = '', articles = [], maxResults = 2) {
  if (!queryText || !Array.isArray(articles) || articles.length === 0) return [];

  const results = searchKnowledgeBase(queryText, articles, 'ALL');
  // Require minimum score to avoid false positive attribution
  const verifiedResults = results.filter((r) => r.score >= 8);

  return verifiedResults.slice(0, maxResults).map((r) => ({
    id: r.article.id,
    title: r.article.title,
    category: r.article.category,
    sourceDocument: r.article.sourceDocument || `${r.article.id}.md`,
    instructions: r.article.troubleshootingInstructions || [],
    score: r.score,
    matchReason: r.matchReason,
  }));
}
