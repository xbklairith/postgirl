import { test, expect } from '@playwright/test';

test.describe('Many Tabs Layout Issue', () => {
  test('should maintain send button visibility with 15 tabs open', async ({ page }) => {
    console.log('=== MANY TABS LAYOUT TEST (15 TABS) ===');
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Navigate to API Testing
    await page.click('button:has-text("API Testing")');
    await page.waitForTimeout(500);

    // Create workspace if needed
    const noWorkspaceText = page.locator('text=No Active Workspace');
    if (await noWorkspaceText.isVisible()) {
      console.log('Creating workspace for many tabs test...');
      await page.click('text=Go to Workspaces');
      await page.waitForSelector('[data-testid="create-workspace-button"]', { timeout: 10000 });
      await page.click('[data-testid="create-workspace-button"]');
      await page.waitForSelector('text=Skip Git (Local Only)', { timeout: 5000 });
      await page.click('text=Skip Git (Local Only)');
      await page.waitForSelector('[data-testid="workspace-name-input"]', { timeout: 5000 });
      await page.fill('[data-testid="workspace-name-input"]', 'Many Tabs Test');
      await page.click('text=Create Workspace');
      await page.waitForSelector('text=Many Tabs Test', { timeout: 10000 });
      
      // Force modal close
      await page.evaluate(() => {
        const modal = document.querySelector('.fixed.inset-0');
        if (modal) modal.remove();
      });
      
      await page.waitForTimeout(500);
      await page.click('button:has-text("API Testing")');
      await page.waitForSelector('[data-testid="api-testing-container"]', { timeout: 5000 });
    }

    // Measure initial layout
    const initialLayout = await page.evaluate(() => {
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const sidebar = document.querySelector('.bg-slate-50');
      const mainContent = document.querySelector('[data-testid="main-content-area"]');
      const requestArea = document.querySelector('#request-crafting-area');
      
      return {
        viewport,
        sidebar: sidebar ? {
          width: sidebar.getBoundingClientRect().width,
          right: sidebar.getBoundingClientRect().right
        } : null,
        mainContent: mainContent ? {
          width: mainContent.getBoundingClientRect().width,
          left: mainContent.getBoundingClientRect().left,
          right: mainContent.getBoundingClientRect().right
        } : null,
        requestArea: requestArea ? {
          width: requestArea.getBoundingClientRect().width,
          left: requestArea.getBoundingClientRect().left,
          right: requestArea.getBoundingClientRect().right
        } : null
      };
    });

    console.log('Initial layout (0 tabs):', JSON.stringify(initialLayout, null, 2));

    // Create 15 tabs
    const targetTabs = 15;
    let tabsCreated = 0;

    for (let i = 1; i <= targetTabs; i++) {
      console.log(`Creating tab ${i}/${targetTabs}...`);
      
      // Try multiple methods to create a tab
      let created = false;
      
      // Method 1: New tab button
      const newTabBtn = page.locator('button:has-text("New Tab"), button[data-testid="new-request-button"]').first();
      if (await newTabBtn.isVisible()) {
        await newTabBtn.click();
        created = true;
      } else {
        // Method 2: Plus button
        const plusBtn = page.locator('button[title*="New"], button:has(svg)').first();
        if (await plusBtn.isVisible()) {
          await plusBtn.click();
          created = true;
        } else {
          // Method 3: Keyboard shortcut
          await page.keyboard.press('Control+t');
          created = true;
        }
      }

      if (created) {
        await page.waitForTimeout(200);
        tabsCreated++;
        
        // Check current tab count
        const currentTabCount = await page.locator('[data-testid="request-tab"]').count();
        console.log(`Tab ${i}: Created successfully. Total tabs: ${currentTabCount}`);
        
        // Take screenshot every 5 tabs
        if (i % 5 === 0) {
          await page.screenshot({
            path: `test-results/many-tabs-${i}-tabs.png`,
            fullPage: true
          });

          // Measure layout changes
          const currentLayout = await page.evaluate(() => {
            const viewport = { width: window.innerWidth, height: window.innerHeight };
            const sidebar = document.querySelector('.bg-slate-50');
            const mainContent = document.querySelector('[data-testid="main-content-area"]');
            const requestArea = document.querySelector('#request-crafting-area');
            const tabBar = document.querySelector('.flex.items-center.border-b');
            const tabContainer = document.querySelector('.flex.transition-transform');
            
            return {
              viewport,
              sidebar: sidebar ? {
                width: sidebar.getBoundingClientRect().width
              } : null,
              mainContent: mainContent ? {
                width: mainContent.getBoundingClientRect().width,
                overflowX: window.getComputedStyle(mainContent).overflowX
              } : null,
              requestArea: requestArea ? {
                width: requestArea.getBoundingClientRect().width,
                overflowX: window.getComputedStyle(requestArea).overflowX
              } : null,
              tabBar: tabBar ? {
                width: tabBar.getBoundingClientRect().width,
                overflowX: window.getComputedStyle(tabBar).overflowX
              } : null,
              tabContainer: tabContainer ? {
                width: tabContainer.getBoundingClientRect().width,
                computedWidth: window.getComputedStyle(tabContainer).width
              } : null
            };
          });

          console.log(`Layout after ${i} tabs:`, JSON.stringify(currentLayout, null, 2));

          // Check if request area is expanding beyond viewport
          if (currentLayout.requestArea && currentLayout.requestArea.width > initialLayout.viewport.width) {
            console.log(`🚨 REQUEST AREA EXPANSION DETECTED at ${i} tabs!`);
            console.log(`Request area width: ${currentLayout.requestArea.width}px`);
            console.log(`Viewport width: ${initialLayout.viewport.width}px`);
          }
        }
      } else {
        console.log(`Failed to create tab ${i}`);
        break;
      }
    }

    console.log(`Successfully created ${tabsCreated} tabs`);

    // Take final screenshot
    await page.screenshot({
      path: `test-results/many-tabs-final-${tabsCreated}-tabs.png`,
      fullPage: true
    });

    // Check for send button visibility
    console.log('Checking send button visibility...');
    
    // Look for send button
    const sendButton = page.locator('button:has-text("Send"), [data-testid="send-request-button"], button[title*="Send"]').first();
    
    const sendButtonVisible = await sendButton.isVisible().catch(() => false);
    const sendButtonInViewport = await sendButton.isInViewport().catch(() => false);
    
    console.log(`Send button visible: ${sendButtonVisible}`);
    console.log(`Send button in viewport: ${sendButtonInViewport}`);

    if (!sendButtonInViewport) {
      console.log('🚨 SEND BUTTON IS NOT IN VIEWPORT!');
      
      // Get send button position
      const sendButtonPos = await sendButton.boundingBox().catch(() => null);
      const viewportSize = await page.viewportSize();
      
      console.log('Send button position:', sendButtonPos);
      console.log('Viewport size:', viewportSize);
      
      if (sendButtonPos && viewportSize) {
        const isOffScreen = sendButtonPos.x + sendButtonPos.width > viewportSize.width;
        console.log(`Send button off-screen to the right: ${isOffScreen}`);
      }
    }

    // Check overall layout health
    const finalLayoutAnalysis = await page.evaluate(() => {
      const body = document.body;
      const hasHorizontalScroll = body.scrollWidth > window.innerWidth;
      const mainLayout = document.querySelector('.flex-1.flex.min-h-0');
      const apiTestingMain = document.querySelector('#api-testing-main');
      
      return {
        hasHorizontalScroll,
        bodyScrollWidth: body.scrollWidth,
        windowWidth: window.innerWidth,
        mainLayout: mainLayout ? {
          width: mainLayout.getBoundingClientRect().width,
          overflowX: window.getComputedStyle(mainLayout).overflowX
        } : null,
        apiTestingMain: apiTestingMain ? {
          width: apiTestingMain.getBoundingClientRect().width,
          overflowX: window.getComputedStyle(apiTestingMain).overflowX
        } : null
      };
    });

    console.log('Final layout analysis:', JSON.stringify(finalLayoutAnalysis, null, 2));

    if (finalLayoutAnalysis.hasHorizontalScroll) {
      console.log('🚨 HORIZONTAL SCROLL DETECTED - Layout is expanding beyond viewport!');
    }

    // Assert that send button should be visible
    expect(sendButtonInViewport).toBe(true);
  });
});