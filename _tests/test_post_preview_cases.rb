# Synthetic unit inputs only; never added to published posts.
require 'jekyll'

root = ARGV.fetch(0)
site = Jekyll::Site.new(Jekyll.configuration({
  'source' => root, 'config' => [], 'plugins' => [], 'theme' => nil,
  'baseurl' => '', 'url' => 'https://example.invalid', 'quiet' => true,
  'disable_disk_cache' => true, 'cache_dir' => '/srv/jekyll/.preview-test-cache'
}))
Liquid::Template.register_filter(Jekyll::Filters)
template = Liquid::Template.parse(File.read(File.join(root, '_includes/post-preview.html')))
image = '/assets/images/2026-10-22/synthid-text-watermark-lab.jpg'
raise 'Expected fixture image is absent' unless File.file?(File.join(root, image.delete_prefix('/')))
base = {'title' => 'Fixture <title>', 'date' => '2000-01-01 00:00:00 +0000',
        'categories' => [], 'url' => '/fixture/', 'description' => '',
        'content' => '', 'excerpt' => '', 'image' => nil}
render = lambda do |changes|
  template.render!({'include' => {'post' => base.merge(changes), 'date_format' => '%Y-%m-%d',
                                  'image_paths' => [image], 'eager' => false}},
                   registers: {site: site})
end
checks = [
  ['description_preferred_and_escaped', {'description' => '具體的摘要 &amp; 方法', 'content' => '<p>不應抽到這裡</p>'},
   ->(out) { out.include?('具體的摘要 &amp; 方法') && !out.include?('不應抽到這裡') && out.include?('Fixture &lt;title&gt;') }],
  ['hero_and_source_skipped', {'content' => "<p><img src=\"#{image}\"></p><p>來源：單元測試</p><p>這才是真正的內容預覽。</p>"},
   ->(out) { out.include?('這才是真正的內容預覽。') && !out.include?('來源：單元測試') && out.include?("src=\"#{image}\"") }],
  ['source_only_has_no_fake_summary', {'content' => '<p>來源：單元測試</p>', 'excerpt' => '<p>來源：單元測試</p>'},
   ->(out) { !out.include?('post-excerpt') && !out.include?('來源：單元測試') }],
  ['image_only_has_no_fake_summary', {'content' => "<p><img src=\"#{image}\"></p>", 'excerpt' => "<p><img src=\"#{image}\"></p>"},
   ->(out) { !out.include?('post-excerpt') && out.include?("src=\"#{image}\"") }],
  ['missing_metadata_uses_existing_hero', {'image' => '/assets/missing-preview.jpg', 'content' => "<p><img src=\"#{image}\"></p><p>有效的文字預覽。</p>"},
   ->(out) { out.include?("src=\"#{image}\"") && !out.include?('missing-preview.jpg') }],
  ['image_object_supported', {'image' => {'path' => image}, 'description' => '物件格式圖片的摘要。'},
   ->(out) { out.include?("src=\"#{image}\"") && out.include?('物件格式圖片的摘要。') }],
  ['longer_lead_replaces_short_description', {'description' => '舊摘要。', 'content' => '<p>這是更完整的正文導讀，除了說明主題，也交代讀者可以看到的方法、結果與限制。</p>'},
   ->(out) { out.include?('這是更完整的正文導讀') && !out.include?('舊摘要。') }],
  ['long_preview_allows_320_characters', {'description' => '甲' * 400},
   ->(out) { text = out[/<p class="post-excerpt">([^<]*)<\/p>/, 1]; text && text.length == 320 && text.start_with?('甲' * 161) }],
  ['no_image_no_placeholder', {'description' => '沒有圖片的文章保持純文字。'},
   ->(out) { out.include?('post-preview--no-image') && !out.include?('<img') && !out.include?('post-preview-thumbnail') }]
]
checks.each do |name, changes, valid|
  out = render.call(changes)
  raise "FAIL #{name}: #{out}" unless valid.call(out)
  puts "PASS #{name}"
end
puts "#{checks.size} Liquid preview cases passed"
