---
layout: page
title: 搜尋
permalink: /search/
nav: true
---

<!-- Pagefind Component UI（1.5.0+ 官方推薦，自包含、零 dynamic import 坑） -->
<link href="{{ '/pagefind/pagefind-component-ui.css' | relative_url }}" rel="stylesheet">
<script src="{{ '/pagefind/pagefind-component-ui.js' | relative_url }}" type="module"></script>

<pagefind-searchbox autofocus></pagefind-searchbox>

<noscript>
<p style="color: var(--text-secondary); font-size: 0.9rem;">
  搜尋功能需要 JavaScript 才能運作。請啟用後重新整理。
</p>
</noscript>
