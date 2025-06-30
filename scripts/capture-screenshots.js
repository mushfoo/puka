import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureScreenshots() {
  const browser = await chromium.launch();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const screenshotDir = path.join(__dirname, '..', 'screenshots');
  
  // Ensure screenshots directory exists
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  try {
    console.log('Starting screenshot capture...');
    
    // Desktop Screenshots (1200px width)
    console.log('Capturing desktop screenshots...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1200, height: 800 }
    });
    const desktopPage = await desktopContext.newPage();
    
    await desktopPage.goto('http://localhost:5174');
    await desktopPage.waitForLoadState('networkidle');
    
    // Wait for the app to fully load and main content to render
    await desktopPage.waitForSelector('main', { timeout: 10000 });
    await desktopPage.waitForTimeout(2000); // Give time for streak display to render
    
    // Take full page screenshot
    await desktopPage.screenshot({
      path: path.join(screenshotDir, `01-prominent-streak-desktop-${timestamp}.png`),
      fullPage: true
    });
    
    console.log('Desktop screenshot captured successfully');
    
    await desktopContext.close();
    
    // Mobile Screenshots (375px width)
    console.log('Capturing mobile screenshots...');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 }
    });
    const mobilePage = await mobileContext.newPage();
    
    await mobilePage.goto('http://localhost:5174');
    await mobilePage.waitForLoadState('networkidle');
    
    // Wait for the app to fully load and main content to render
    await mobilePage.waitForSelector('main', { timeout: 10000 });
    await mobilePage.waitForTimeout(2000); // Give time for streak display to render
    
    // Take full page screenshot
    await mobilePage.screenshot({
      path: path.join(screenshotDir, `02-prominent-streak-mobile-${timestamp}.png`),
      fullPage: true
    });
    
    console.log('Mobile screenshot captured successfully');
    
    await mobileContext.close();
    
    // Additional screenshots with different states if possible
    console.log('Capturing additional state screenshots...');
    
    // Desktop with focus on streak card
    const focusContext = await browser.newContext({
      viewport: { width: 1200, height: 800 }
    });
    const focusPage = await focusContext.newPage();
    
    await focusPage.goto('http://localhost:5174');
    await focusPage.waitForLoadState('networkidle');
    await focusPage.waitForSelector('main', { timeout: 10000 });
    await focusPage.waitForTimeout(2000); // Give time for streak display to render
    
    // Scroll to ensure streak card is in view (look for gradient background)
    await focusPage.evaluate(() => {
      const streakElement = document.querySelector('.bg-gradient-to-r');
      if (streakElement) {
        streakElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    
    await focusPage.waitForTimeout(1000); // Wait for smooth scroll
    
    await focusPage.screenshot({
      path: path.join(screenshotDir, `03-prominent-streak-focused-${timestamp}.png`),
      fullPage: true
    });
    
    console.log('Focused streak screenshot captured successfully');
    
    await focusContext.close();
    
    console.log('All screenshots captured successfully!');
    
    // Return information about captured screenshots
    return {
      screenshots: [
        `01-prominent-streak-desktop-${timestamp}.png`,
        `02-prominent-streak-mobile-${timestamp}.png`,
        `03-prominent-streak-focused-${timestamp}.png`
      ],
      timestamp,
      screenshotDir
    };
    
  } catch (error) {
    console.error('Error capturing screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the screenshot capture
captureScreenshots()
  .then((result) => {
    console.log('\n=== Screenshot Capture Complete ===');
    console.log('Screenshots saved to:', result.screenshotDir);
    console.log('Files created:');
    result.screenshots.forEach(file => console.log(`  - ${file}`));
    console.log(`Timestamp: ${result.timestamp}`);
  })
  .catch((error) => {
    console.error('Screenshot capture failed:', error);
    process.exit(1);
  });