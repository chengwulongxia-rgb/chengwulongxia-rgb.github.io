---
layout: page
title: 搜尋
permalink: /search/
nav: true
---

<script src=" https://cdn.jsdelivr.net/npm/@pagefind/default-ui@1.5.2/ui.min.js "></script>
<link href=" https://cdn.jsdelivr.net/npm/@pagefind/default-ui@1.5.2/css/ui.min.css " rel="stylesheet">

<div id="search"></div>

<script>
  window.addEventListener('DOMContentLoaded', () => {
    new PagefindUI({
      element: "#search",
      bundlePath: "{{ '/pagefind/' | relative_url }}",
      showImages: false,
      showEmptyFilters: false,
      resetStyles: false,
      translations: {
        placeholder: "搜尋文章標題、內容、分類……",
        clear_search: "清除",
        load_more: "載入更多結果",
        search_label: "搜尋整站",
        filters_label: "篩選",
        zero_results: "找不到「[SEARCH_TERM]」相關的文章",
        many_results: "「[SEARCH_TERM]」找到 [COUNT] 篇文章",
        one_result: "「[SEARCH_TERM]」找到 [COUNT] 篇文章",
        alt_search: "找不到「[SEARCH_TERM]」，以下是「[DIFFERENT_TERM]」的搜尋結果",
        search_suggestion: "找不到「[SEARCH_TERM]」，試試其他關鍵字",
        searching: "搜尋「[SEARCH_TERM]」中……"
      }
    });
  });
</script>

<noscript>
<p style="color: var(--text-secondary); font-size: 0.9rem;">
  搜尋功能需要 JavaScript 才能運作。請啟用後重新整理。
</p>
</noscript>
