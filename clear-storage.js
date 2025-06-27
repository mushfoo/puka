// This script will be run by Playwright to clear localStorage
await page.evaluate(() => {
  localStorage.clear();
  console.log('LocalStorage cleared');
});
await page.reload();
console.log('Page reloaded');
EOF < /dev/null