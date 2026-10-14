import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Search,
  PlusCircle,
  Eye,
  Star,
  Sparkles,
  CheckCircle2,
  Calendar,
  User,
  ArrowRight,
  FileText,
  AlertCircle,
  Share2,
  Layers,
  Database,
  Cpu,
  Hash,
  ExternalLink,
  SlidersHorizontal,
  FolderOpen,
  Copy,
  Check,
  FileCheck,
  Zap,
  Info
} from 'lucide-react';
import { CategoryBadge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { StatCard } from '../components/common/StatCard.jsx';
import { api } from "../services/api.js";

export function KnowledgeBase({ searchQuery: externalSearchQuery = '' }) {
  const [articles, setArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [articleError, setArticleError] = useState('');
  const [isSavingArticle, setIsSavingArticle] = useState(false);
  const [localSearch, setLocalSearch] = useState(externalSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeArticle, setActiveArticle] = useState(null);
  const [activeArticleTab, setActiveArticleTab] = useState('guide'); // 'guide' | 'rag-chunks'
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showRagExplainer, setShowRagExplainer] = useState(false);

  // New Article Draft Form State
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCategory, setDraftCategory] = useState('Network & Connectivity');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftSteps, setDraftSteps] = useState('');
  const [draftTags, setDraftTags] = useState('');
  const [draftSource, setDraftSource] = useState('');
  const [successToast, setSuccessToast] = useState(null);

  // Most frequently searched topics
  const popularTopics = [
    { label: 'VPN Connection', query: 'VPN' },
    { label: 'Password Reset', query: 'password' },
    { label: 'Outlook Sync', query: 'Outlook' },
    { label: 'Wi-Fi 802.1X', query: 'Wi-Fi' },
    { label: 'MFA Push', query: 'MFA' },
    { label: 'Software Install', query: 'Software' },
  ];

  const mapBackendArticle = useCallback((raw) => ({
    id: raw.article_id || raw.id,
    title: raw.title || 'Untitled article',
    category: raw.category || 'General',
    shortDescription: raw.shortDescription || raw.summary || raw.content || raw.body || '',
    content: raw.content || raw.body || '',
    troubleshootingInstructions: raw.troubleshooting_instructions || raw.troubleshootingInstructions || [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    lastUpdated: (raw.updated_at || raw.updatedAt || raw.lastUpdated || '').toString().slice(0, 10) || 'Date not provided',
    sourceDocument: raw.source_document || raw.sourceDocument || `${raw.article_id || raw.id || 'article'}.md`,
    approved: raw.approved === true,
    ragMetadata: raw.ragMetadata || null,
  }), []);

  const loadArticles = useCallback(async () => {
    setLoadingArticles(true);
    setArticleError('');
    try {
      const response = await api.getArticles('ALL');
      const rows = Array.isArray(response?.items) ? response.items : [];
      setArticles(rows.map(mapBackendArticle));
    } catch (error) {
      setArticleError(`Could not load articles from the backend: ${error.message}`);
      setArticles([]);
    } finally {
      setLoadingArticles(false);
    }
  }, [mapBackendArticle]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const effectiveQuery = localSearch || externalSearchQuery;

  useEffect(() => {
    let cancelled = false;
    const runSearch = async () => {
      if (loadingArticles) return;
      setSearchLoading(true);
      try {
        if (!effectiveQuery.trim()) {
          const filtered = selectedCategory === 'ALL'
            ? articles
            : articles.filter((article) => article.category === selectedCategory);
          if (!cancelled) {
            setSearchResults(filtered.map((article) => ({
              article,
              score: 0,
              matchReason: 'Browsing approved backend articles.',
              relevantExcerpt: article.shortDescription || article.content || '',
            })));
          }
        } else {
          const response = await api.searchKnowledge(effectiveQuery, selectedCategory);
          const items = Array.isArray(response?.items) ? response.items : [];
          const mapped = items.map((raw) => {
            const article = mapBackendArticle(raw);
            return {
              article,
              score: Number(raw.score || 0),
              matchReason: raw.retrieval_mode || 'Matched by backend knowledge retrieval.',
              relevantExcerpt: raw.content || article.shortDescription || '',
            };
          });

          // The backend performs semantic retrieval and may return broad candidates.
          // Apply a visible keyword/category filter so unrelated articles are not
          // presented as direct matches for a specific search.
          const queryTerms = effectiveQuery
            .toLowerCase()
            .replace(/[^a-z0-9.#+\s-]/g, ' ')
            .split(/\s+/)
            .filter((term) => term.length > 1 && !['the', 'and', 'for', 'with', 'how', 'does', 'can', 'my', 'is', 'not', 'a', 'to', 'in', 'on', 'issue', 'problem'].includes(term));

          const filtered = mapped.filter(({ article, relevantExcerpt }) => {
            const categoryMatches = selectedCategory === 'ALL' || article.category === selectedCategory;
            if (!categoryMatches) return false;
            if (queryTerms.length === 0) return true;

            const searchableText = [
              article.id,
              article.title,
              article.category,
              article.sourceDocument,
              article.shortDescription,
              article.content,
              relevantExcerpt,
              ...(Array.isArray(article.tags) ? article.tags : []),
            ].join(' ').toLowerCase();

            // Require all meaningful terms for multi-word searches to avoid
            // displaying unrelated semantic candidates; single-term searches
            // match that keyword directly.
            return queryTerms.length === 1
              ? searchableText.includes(queryTerms[0])
              : queryTerms.every((term) => searchableText.includes(term));
          });
          if (!cancelled) setSearchResults(filtered);
        }
      } catch (error) {
        if (!cancelled) {
          setArticleError(`Knowledge search failed: ${error.message}`);
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    };
    runSearch();
    return () => { cancelled = true; };
  }, [effectiveQuery, selectedCategory, articles, loadingArticles, mapBackendArticle]);

  const categories = useMemo(() => [
    'ALL',
    ...new Set(articles.map((article) => article.category).filter(Boolean)),
  ], [articles]);

  const recentlyUpdatedCount = articles.filter((article) => {
    if (!article.lastUpdated || article.lastUpdated === 'Date not provided') return false;
    const parsed = new Date(article.lastUpdated);
    const ageDays = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
    return Number.isFinite(ageDays) && ageDays >= 0 && ageDays <= 30;
  }).length;

  const handleCopyCitation = (article) => {
    navigator.clipboard?.writeText(`${article.id}: ${article.title} (${article.sourceDocument})`);
    setCopiedId(article.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCreateDraft = async (e) => {
    e.preventDefault();
    if (!draftTitle.trim() || !draftDescription.trim()) return;

    const stepsArray = draftSteps
      .split('\\n')
      .map((step) => step.trim().replace(/^[0-9]+[.)]\\s*/, ''))
      .filter(Boolean);
    const tagsArray = draftTags
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);
    const articleId = `KB-${Date.now().toString().slice(-8)}`;
    const content = [
      draftDescription.trim(),
      ...stepsArray.map((step, index) => `${index + 1}. ${step}`),
    ].join('\\n');

    setIsSavingArticle(true);
    setArticleError('');
    try {
      const response = await api.ingestArticle({
        article_id: articleId,
        title: draftTitle.trim(),
        category: draftCategory,
        source_document: draftSource.trim() || `${articleId}.md`,
        content,
        approved: false,
        troubleshooting_instructions: stepsArray.length ? stepsArray : [draftDescription.trim()],
        tags: tagsArray,
      });

      await loadArticles();
      setIsDraftModalOpen(false);
      setDraftTitle('');
      setDraftDescription('');
      setDraftSteps('');
      setDraftTags('');
      setDraftSource('');
      setSuccessToast(
        response?.success
          ? `Article ${articleId} saved as pending approval. It will not appear in approved search until approved.`
          : 'The backend did not confirm that the article was saved.'
      );
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (error) {
      setArticleError(`Article was not saved: ${error.message}`);
    } finally {
      setIsSavingArticle(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 1. TOP HEADER & KNOWLEDGE OVERVIEW */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 sm:p-6 rounded-2xl shadow-xs relative overflow-hidden">
        {/* Subtle top ambient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500"></div>

        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              IT Knowledge Base
            </h2>
            <span className="text-[10px] font-bold font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200 uppercase">
              Approved IT Knowledge Base
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xl">
            Stores troubleshooting guides and standard operating procedures (SOPs) so users and AI can find relevant solutions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setShowRagExplainer(!showRagExplainer)}
            className="px-3.5 py-2 text-xs text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl font-semibold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Database className="w-3.5 h-3.5 text-purple-600" />
            <span>How AI Uses Guides (RAG)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDraftModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Troubleshooting Guide</span>
          </button>
        </div>
      </div>

      {/* RAG Pipeline Architecture Viewer (Expandable Info Card) */}
      {showRagExplainer && (
        <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-5 text-xs space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-600" />
              Enterprise RAG (Retrieval-Augmented Generation) Architecture
            </span>
            <span className="text-[10px] font-mono text-purple-800 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md">
              Lexical &amp; Semantic Grounding
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-purple-900 pt-1 overflow-x-auto no-scrollbar">
            <span className="bg-white px-3 py-1.5 rounded-lg border border-purple-200 text-slate-800 font-mono shadow-xs">Raw SOP Docs</span>
            <span className="text-purple-600 font-bold">→</span>
            <span className="bg-white px-3 py-1.5 rounded-lg border border-purple-200 text-slate-800 font-mono shadow-xs">Semantic Chunking</span>
            <span className="text-purple-600 font-bold">→</span>
            <span className="bg-white px-3 py-1.5 rounded-lg border border-purple-200 text-slate-800 font-mono shadow-xs">Text Embeddings</span>
            <span className="text-purple-600 font-bold">→</span>
            <span className="bg-white px-3 py-1.5 rounded-lg border border-purple-200 text-slate-800 font-mono shadow-xs">Vector Database</span>
            <span className="text-purple-600 font-bold">→</span>
            <span className="bg-white px-3 py-1.5 rounded-lg border border-purple-200 text-slate-800 font-mono shadow-xs">KNN Semantic Match</span>
            <span className="text-purple-600 font-bold">→</span>
            <span className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-3 py-1.5 rounded-lg font-bold shadow-xs">
              Grounded AI Answer
            </span>
          </div>

          <p className="text-[11px] text-purple-900/90 leading-relaxed">
            Approved articles are stored in the backend with source-document metadata. The backend currently indexes whole article text for retrieval; the chunk preview in this UI is illustrative unless real chunk records are returned by the backend.
          </p>
        </div>
      )}

      {/* Summary KPI Cards with Clean Aesthetics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Articles"
          value={articles.length}
          change="Backend articles"
          changeType="positive"
          subtitle={loadingArticles ? "Loading from backend..." : "Articles returned by FastAPI"}
          icon={BookOpen}
        />
        <StatCard
          title="Categories"
          value={new Set(articles.map((article) => article.category).filter(Boolean)).size}
          change="Technical Domains"
          changeType="neutral"
          subtitle="Network, Identity, O365"
          icon={FolderOpen}
        />
        <StatCard
          title="Recently Updated"
          value={`${recentlyUpdatedCount} of ${articles.length}`}
          change="Updated in last 30 days"
          changeType="positive"
          subtitle="Calculated from article timestamps"
          icon={Calendar}
        />
        <StatCard
          title="Grounding Score"
          value="Source-linked"
          change="Not a quality guarantee"
          changeType="positive"
          subtitle="Approved articles include source metadata"
          icon={CheckCircle2}
          variant="dark"
        />
      </div>

      {/* Success Notification Alert */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs px-2 py-0.5 rounded transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. SEARCH & DISCOVERY BAR */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by keywords, error codes, tags, or document title... (e.g. 'VPN', 'password', 'Wi-Fi')"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-10 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all font-sans"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cyan-700 hover:text-cyan-800 font-medium px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Popular Search Suggestions Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs pt-0.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 font-mono">
            Frequently Searched:
          </span>
          {popularTopics.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setLocalSearch(item.query)}
              className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all ${
                localSearch.toLowerCase().includes(item.query.toLowerCase())
                  ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Category Filter Tabs */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-cyan-800 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-lg shrink-0">
            {searchResults.length} {searchResults.length === 1 ? 'Article' : 'Articles'} Found
          </span>
        </div>
      </div>

      {articleError && (
        <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs">
          {articleError}
          <button type="button" onClick={loadArticles} className="ml-2 underline font-semibold">Retry</button>
        </div>
      )}

      {/* 3. SEARCH RESULTS & SOURCE ATTRIBUTION LIST */}
      <div>
        {loadingArticles ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">Loading approved knowledge articles from FastAPI...</div>
        ) : searchLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">Searching approved knowledge in FastAPI...</div>
        ) : searchResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchResults.map(({ article, score, matchReason, relevantExcerpt }) => (
              <div
                key={article.id}
                className="bg-white border border-slate-200/90 hover:border-cyan-300 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group"
              >
                <div className="space-y-3">
                  {/* Article Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                        {article.id}
                      </span>
                      <CategoryBadge category={article.category} />
                    </div>

                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200 font-mono">
                      <FileCheck className="w-3 h-3 text-emerald-600" />
                      Grounded Source
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-sm font-bold text-slate-900 leading-snug group-hover:text-cyan-700 cursor-pointer transition-colors"
                    onClick={() => {
                      setActiveArticle(article);
                      setActiveArticleTab('guide');
                    }}
                  >
                    {article.title}
                  </h3>

                  {/* Source Document Attribution */}
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <FileText className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                    <span className="truncate">Source Doc: {article.sourceDocument}</span>
                  </div>

                  {/* Relevant Excerpt / Snippet */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1 font-mono">
                      Relevant Content Excerpt
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      {relevantExcerpt}
                    </p>
                  </div>

                  {/* Why this matched the search */}
                  {effectiveQuery && (
                    <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200 text-[11px] text-purple-900">
                      <span className="font-bold text-purple-800">Match Rationale: </span>
                      <span>{matchReason}</span>
                    </div>
                  )}

                  {/* Search Tags */}
                  {Array.isArray(article.tags) && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {article.tags.slice(0, 5).map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-slate-500">
                    Updated: {article.lastUpdated}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyCitation(article)}
                      className="p-1.5 text-slate-500 hover:text-cyan-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                      title="Copy Article Citation"
                    >
                      {copiedId === article.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveArticle(article);
                        setActiveArticleTab('guide');
                      }}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <span>Read Runbook</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 sm:p-12 text-center space-y-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                No matching verified knowledge article was found.
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                No approved backend article matched "{effectiveQuery}". Check the spelling, try broader keywords, or escalate to an IT specialist.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                setSelectedCategory('ALL');
              }}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              Reset Search &amp; View All Articles
            </button>
          </div>
        )}
      </div>

      {/* 4. ARTICLE DETAIL MODAL (FULL CONTENT & RAG CHUNKS INSPECTOR) */}
      {activeArticle && (
        <Modal
          isOpen={true}
          onClose={() => setActiveArticle(null)}
          title={`${activeArticle.id}: ${activeArticle.title}`}
          maxWidth="max-w-3xl"
          footer={
            <div className="flex items-center justify-between w-full text-xs">
              <span className="text-slate-500 font-mono text-[11px]">
                Source Document: {activeArticle.sourceDocument}
              </span>
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold transition-colors border border-slate-200"
              >
                Close Article
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            {/* Top Meta Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CategoryBadge category={activeArticle.category} />
                <span className="text-slate-300">•</span>
                <span className="font-mono text-[11px] text-slate-500">
                  Last Updated: {activeArticle.lastUpdated}
                </span>
              </div>

              {/* View Toggle: Standard SOP vs RAG Chunks */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveArticleTab('guide')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    activeArticleTab === 'guide'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  SOP Instructions
                </button>
                <button
                  type="button"
                  onClick={() => setActiveArticleTab('rag-chunks')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    activeArticleTab === 'rag-chunks'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Content Preview (illustrative)
                </button>
              </div>
            </div>

            {/* Short Description */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-700 italic">
              {activeArticle.shortDescription || activeArticle.summary}
            </div>

            {/* TAB A: Standard SOP Troubleshooting Instructions */}
            {activeArticleTab === 'guide' ? (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <FileText className="w-3.5 h-3.5 text-cyan-600" />
                  Step-by-Step Resolution Runbook:
                </h4>

                {Array.isArray(activeArticle.troubleshootingInstructions) ? (
                  <ol className="list-decimal list-inside space-y-2 text-xs text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {activeArticle.troubleshootingInstructions.map((step, idx) => (
                      <li key={idx} className="leading-relaxed pl-1">
                        <span className="font-medium text-slate-800">{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs text-slate-700">
                    {activeArticle.content}
                  </div>
                )}

                {/* Tags footer */}
                {Array.isArray(activeArticle.tags) && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1 font-mono">
                      Search Index Keywords:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {activeArticle.tags.map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 text-slate-600 border border-slate-200"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* TAB B: RAG Chunks Inspector (Dark Technical View) */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-purple-700 text-xs flex items-center gap-1.5 font-mono">
                    <Database className="w-3.5 h-3.5 text-purple-600" />
                    Illustrative Chunk Preview — Not Backend Chunk Records
                  </h4>
                  <span className="font-mono text-[10px] text-purple-700 font-bold">
                    Preview only
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(activeArticle.ragMetadata?.chunks || [{ chunkId: `${activeArticle.id}-preview`, heading: 'Article content preview', text: activeArticle.content || activeArticle.shortDescription || 'No content supplied by backend.' }]).map((chunk, cIdx) => (
                    <div
                      key={cIdx}
                      className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1.5 text-slate-100 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-cyan-400">
                          {chunk.chunkId}
                        </span>
                        <span className="font-semibold text-slate-300">
                          {chunk.heading}
                        </span>
                      </div>
                      <p className="text-slate-200 text-xs font-mono leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                        {chunk.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 5. PROPOSE NEW SOP ARTICLE MODAL */}
      {isDraftModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsDraftModalOpen(false)}
          title="Propose New IT Standard Operating Procedure (SOP)"
          maxWidth="max-w-2xl"
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsDraftModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateDraft}
                className="px-4 py-1.5 text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-semibold shadow-xs"
              >
                Submit for Approval
              </button>
            </>
          }
        >
          <form onSubmit={handleCreateDraft} className="space-y-3.5 text-xs text-slate-800">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Article Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Diagnosing WireGuard Handshake Drops on Linux Workstations"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="Network & Connectivity">Network & Connectivity</option>
                  <option value="Identity & Access">Identity & Access</option>
                  <option value="Email & Collaboration">Email & Collaboration</option>
                  <option value="Hardware & Systems">Hardware & Systems</option>
                  <option value="Software & Entitlements">Software & Entitlements</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Source Document File</label>
                <input
                  type="text"
                  placeholder="e.g. SOP-NET-022_WireGuard.md"
                  value={draftSource}
                  onChange={(e) => setDraftSource(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Short Description / Scope <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="Brief summary of the technical problem and root-cause scope..."
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Step-by-Step Troubleshooting Instructions (One per line)
              </label>
              <textarea
                rows={4}
                placeholder="1. Verify interface status&#10;2. Check peer public key&#10;3. Restart wireguard service"
                value={draftSteps}
                onChange={(e) => setDraftSteps(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 text-slate-100 border border-slate-800 rounded-xl text-xs placeholder-slate-500 font-mono focus:outline-hidden focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Search Tags (Comma-separated)
              </label>
              <input
                type="text"
                placeholder="vpn, wireguard, linux, handshake, ubuntu"
                value={draftTags}
                onChange={(e) => setDraftTags(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-hidden focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
