import { test, expect } from '@playwright/test';

test.describe('Tab Expansion Layout Issue', () => {
  test('should maintain sidebar width when opening multiple tabs', async ({ page }) => {
    console.log('=== TAB EXPANSION LAYOUT TEST ===');
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Navigate to API Testing view where tabs are used
    await page.click('button:has-text("API Testing")');
    await page.waitForTimeout(500);

    // Create a workspace if needed
    const noWorkspaceText = page.locator('text=No Active Workspace');
    if (await noWorkspaceText.isVisible()) {
      console.log('Creating workspace for tab test...');
      await page.click('text=Go to Workspaces');
      await page.waitForSelector('[data-testid="create-workspace-button"]', { timeout: 10000 });
      await page.click('[data-testid="create-workspace-button"]');
      await page.waitForSelector('text=Skip Git (Local Only)', { timeout: 5000 });
      await page.click('text=Skip Git (Local Only)');
      await page.waitForSelector('[data-testid="workspace-name-input"]', { timeout: 5000 });
      await page.fill('[data-testid="workspace-name-input"]', 'Tab Test Workspace');
      await page.click('text=Create Workspace');
      await page.waitForSelector('text=Tab Test Workspace', { timeout: 10000 });
      
      // Force modal close
      await page.evaluate(() => {
        const modal = document.querySelector('.fixed.inset-0');
        if (modal) modal.remove();
      });
      
      await page.waitForTimeout(500);
      await page.click('button:has-text("API Testing")');
      await page.waitForSelector('[data-testid="api-testing-container"]', { timeout: 5000 });
    }

    // Find sidebar and measure initial width
    const sidebar = page.locator('.bg-slate-50.dark\\:bg-slate-800').first();
    
    const initialSidebarWidth = await sidebar.evaluate((el) => ({
      offsetWidth: el.offsetWidth,
      boundingWidth: el.getBoundingClientRect().width
    }));

    console.log('Initial sidebar width:', initialSidebarWidth);

    // Find the tab bar container
    const tabBar = page.locator('.flex.items-center.border-b').first();
    
    // Array to track measurements
    const measurements = [
      { step: 'Initial (0 tabs)', sidebarWidth: initialSidebarWidth.offsetWidth, tabCount: 0 }
    ];

    // Create multiple tabs and measure sidebar width after each
    for (let i = 1; i <= 5; i++) {
      console.log(`Creating tab ${i}...`);
      
      // Try different ways to create a new tab
      let tabCreated = false;
      
      // Method 1: Try "New Tab" button
      const newTabButton = page.locator('button:has-text("New Tab")').first();
      if (await newTabButton.isVisible()) {
        await newTabButton.click();
        tabCreated = true;
      } else {
        // Method 2: Try plus icon button
        const plusButton = page.locator('button[title*="New tab"], button[data-testid="new-request-button"]').first();
        if (await plusButton.isVisible()) {
          await plusButton.click();
          tabCreated = true;
        } else {
          // Method 3: Try keyboard shortcut
          await page.keyboard.press('Control+t');
          tabCreated = true;
        }
      }

      if (tabCreated) {
        await page.waitForTimeout(300); // Wait for tab creation animation
        
        // Measure sidebar width after tab creation
        const afterTabWidth = await sidebar.evaluate((el) => ({
          offsetWidth: el.offsetWidth,
          boundingWidth: el.getBoundingClientRect().width
        }));

        // Count current tabs
        const tabCount = await page.locator('[data-testid="request-tab"]').count();
        
        // Measure tab container width
        const tabContainerWidth = await page.evaluate(() => {
          const tabContainer = document.querySelector('.flex.transition-transform');
          return tabContainer ? {
            width: tabContainer.getBoundingClientRect().width,
            computedWidth: window.getComputedStyle(tabContainer).width
          } : null;
        });

        measurements.push({
          step: `After creating tab ${i}`,
          sidebarWidth: afterTabWidth.offsetWidth,
          tabCount: tabCount,
          tabContainerWidth: tabContainerWidth?.width
        });

        console.log(`Tab ${i} created - Sidebar: ${afterTabWidth.offsetWidth}px, Tab Count: ${tabCount}, Tab Container: ${tabContainerWidth?.width}px`);

        // Check for sidebar width change
        if (afterTabWidth.offsetWidth !== initialSidebarWidth.offsetWidth) {
          console.log(`🚨 SIDEBAR WIDTH CHANGED! Initial: ${initialSidebarWidth.offsetWidth}px, After Tab ${i}: ${afterTabWidth.offsetWidth}px`);
          
          // Take screenshot as evidence
          await page.screenshot({
            path: `test-results/sidebar-width-change-tab-${i}.png`,
            fullPage: true
          });
        }
      } else {
        console.log(`Could not create tab ${i} - no new tab button found`);
        break;
      }
    }

    // Take final screenshot showing all tabs
    await page.screenshot({
      path: 'test-results/multiple-tabs-final.png',
      fullPage: true
    });

    // Analyze results
    const sidebarWidths = measurements.map(m => m.sidebarWidth);
    const uniqueSidebarWidths = [...new Set(sidebarWidths)];

    console.log('\n=== TAB EXPANSION ANALYSIS ===');
    measurements.forEach((measurement, index) => {
      console.log(`${index + 1}. ${measurement.step}: Sidebar ${measurement.sidebarWidth}px, Tabs: ${measurement.tabCount}, Container: ${measurement.tabContainerWidth || 'N/A'}px`);
    });

    console.log(`\nSidebar width variations: ${uniqueSidebarWidths.length}`);
    console.log(`Sidebar widths found: ${uniqueSidebarWidths.join(', ')}px`);

    if (uniqueSidebarWidths.length === 1) {
      console.log(`\n✅ SIDEBAR STABLE! Consistent width: ${uniqueSidebarWidths[0]}px despite multiple tabs`);
    } else {
      console.log(`\n🚨 TAB EXPANSION AFFECTS SIDEBAR!`);
      console.log(`Expected: 1 consistent sidebar width`);
      console.log(`Actual: ${uniqueSidebarWidths.length} different widths`);
      console.log(`Range: ${Math.min(...sidebarWidths)}px - ${Math.max(...sidebarWidths)}px`);
    }

    // Test tab switching
    const finalTabCount = await page.locator('[data-testid="request-tab"]').count();
    if (finalTabCount > 1) {
      console.log('\nTesting tab switching...');
      
      for (let i = 0; i < Math.min(3, finalTabCount); i++) {
        const beforeSwitch = await sidebar.evaluate((el) => el.offsetWidth);
        
        await page.locator('[data-testid="request-tab"]').nth(i).click();
        await page.waitForTimeout(200);
        
        const afterSwitch = await sidebar.evaluate((el) => el.offsetWidth);
        
        if (beforeSwitch !== afterSwitch) {
          console.log(`🚨 TAB SWITCH WIDTH CHANGE! Tab ${i}: ${beforeSwitch}px → ${afterSwitch}px`);
        } else {
          console.log(`✅ Tab ${i} switch: Width stable at ${afterSwitch}px`);
        }
      }
    }

    // Assert that sidebar width should remain consistent
    expect(uniqueSidebarWidths.length).toBe(1);
    expect(uniqueSidebarWidths[0]).toBeGreaterThan(200); // Should be expanded width
  });

  test('should verify tab container CSS does not affect parent layout', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 30000 });
    
    // Navigate to API testing
    await page.click('button:has-text("API Testing")');
    await page.waitForTimeout(500);

    const tabBarCSS = await page.evaluate(() => {
      const tabBar = document.querySelector('.flex.items-center.border-b');
      const tabContainer = document.querySelector('.flex.transition-transform');
      
      if (!tabBar) return { error: 'Tab bar not found' };
      
      const tabBarStyle = window.getComputedStyle(tabBar);
      const tabContainerStyle = tabContainer ? window.getComputedStyle(tabContainer) : null;
      
      return {
        tabBar: {
          width: tabBarStyle.width,
          minWidth: tabBarStyle.minWidth,
          maxWidth: tabBarStyle.maxWidth,
          overflow: tabBarStyle.overflow,
          flexGrow: tabBarStyle.flexGrow,
          flexShrink: tabBarStyle.flexShrink
        },
        tabContainer: tabContainerStyle ? {
          width: tabContainerStyle.width,
          minWidth: tabContainerStyle.minWidth,
          maxWidth: tabContainerStyle.maxWidth,
          flexGrow: tabContainerStyle.flexGrow,
          flexShrink: tabContainerStyle.flexShrink
        } : null
      };
    });

    console.log('Tab Bar CSS Analysis:', JSON.stringify(tabBarCSS, null, 2));

    // Check for problematic CSS properties
    if (tabBarCSS.tabContainer?.width && parseInt(tabBarCSS.tabContainer.width) > 1000) {
      console.log('⚠️ WARNING: Tab container has very wide width that might affect layout');
    }

    if (tabBarCSS.tabBar?.overflow !== 'hidden') {
      console.log('⚠️ WARNING: Tab bar should have overflow:hidden to contain tab expansion');
    }
  });
});