/* Evaluate in a browser after setting the viewport; not a published page. */
(() => {
  const wrapper = document.querySelector('main .wrapper');
  const content = document.querySelector('.home-main') || document.querySelector('.post-content') || wrapper;
  if (!wrapper || !content) throw new Error('Missing page content');
  const rect = content.getBoundingClientRect();
  const style = getComputedStyle(content);
  const insetLeft = content === wrapper ? parseFloat(style.paddingLeft) : 0;
  const insetRight = content === wrapper ? parseFloat(style.paddingRight) : 0;
  const width = rect.width - insetLeft - insetRight;
  const left = rect.left + insetLeft;
  const right = rect.right - insetRight;
  const body = document.body.getBoundingClientRect();
  const expectedWidth = Math.min(800, body.width - 48);
  const expectedLeft = body.left + (body.width - expectedWidth) / 2;
  const sidebar = document.querySelector('.sidebar')?.getBoundingClientRect();
  const problems = [];
  if (Math.abs(width - expectedWidth) > 1) problems.push('content width');
  if (Math.abs(left - expectedLeft) > 1) problems.push('content centering');
  if (document.documentElement.scrollWidth > document.documentElement.clientWidth) problems.push('horizontal overflow');
  if (sidebar) {
    if (innerWidth >= 1360) {
      if (sidebar.left < right || sidebar.right > document.documentElement.clientWidth) problems.push('outer sidebar placement');
    } else if (sidebar.top < rect.bottom) {
      problems.push('sidebar should stack below content');
    }
  }
  return {route: location.pathname, viewport: innerWidth, left, right, width, expectedLeft, expectedWidth, problems};
})()
