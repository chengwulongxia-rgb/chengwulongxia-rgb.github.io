# Pagination and category pages are navigation, not canonical article content.
# Keep them crawlable so search engines can read their noindex directives.
Jekyll::Hooks.register :site, :pre_render do |site|
  site.pages.each do |page|
    url = page.url
    if url.start_with?("/page/", "/categories/")
      page.data["sitemap"] = false
    end
  end
end
