---
layout: page
title: 分類
permalink: /all-categories/
nav: true
---

{%- assign all_categories = "" | split: "" -%}
{%- for post in site.posts -%}
  {%- for category in post.categories -%}
    {%- assign all_categories = all_categories | push: category -%}
  {%- endfor -%}
{%- endfor -%}
{%- assign unique_categories = all_categories | uniq | sort -%}

{%- for category in unique_categories -%}
  {%- assign count = 0 -%}
  {%- for post in site.posts -%}
    {%- if post.categories contains category -%}
      {%- assign count = count | plus: 1 -%}
    {%- endif -%}
  {%- endfor -%}

## {{ category }}

{{ count }} 篇文章

{%- for post in site.posts -%}
{%- if post.categories contains category -%}
- [{{ post.title }}]({{ post.url | relative_url }}) — {{ post.date | date: "%Y-%m-%d" }}
{%- endif -%}
{%- endfor -%}

{%- endfor -%}
