import { test, expect } from '@playwright/test';

test.describe('Sidebar Width Bug Investigation', () => {
  test('should demonstrate sidebar width flickering when clicking tabs', async ({ page }) => {
    // Start with detailed logging
    console.log('=== SIDEBAR WIDTH BUG REPRODUCTION TEST ===');
    
    // Navigate to the app
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // First, let's add a data-testid to the sidebar for easier testing
    const sidebar = page.locator('.bg-slate-50.dark\\:bg-slate-800').first();
    await expect(sidebar).toBeVisible();

    // STEP 1: Ensure sidebar is in expanded state
    console.log('Step 1: Ensuring sidebar is expanded...');
    const isCollapsed = await sidebar.evaluate((el) => {
      return el.classList.contains('w-16');
    });
    
    if (isCollapsed) {
      // Click the expand button if collapsed
      await page.click('button[title="Toggle sidebar"]').catch(() => {
        console.log('Expand button not found or already expanded');
      });
    }

    // Measure initial sidebar width
    const initialWidth = await sidebar.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return {
        width: computedStyle.width,
        classList: Array.from(el.classList),
        offsetWidth: el.offsetWidth
      };
    });
    
    console.log('Initial sidebar state:', initialWidth);
    expect(initialWidth.offsetWidth).toBeGreaterThan(200); // Should be ~256px when expanded

    // STEP 2: Navigate to API Testing view
    console.log('Step 2: Navigating to API Testing...');
    await page.click('button:has-text("API Testing")');
    await page.waitForSelector('[data-testid="api-testing-container"]', { timeout: 5000 });

    // Create a workspace if needed (simplified for this test)
    const noWorkspaceText = page.locator('text=No Active Workspace');
    if (await noWorkspaceText.isVisible()) {
      console.log('Creating workspace for test...');
      await page.click('text=Go to Workspaces');
      await page.waitForSelector('[data-testid="create-workspace-button"]', { timeout: 10000 });
      await page.click('[data-testid="create-workspace-button"]');
      await page.waitForSelector('text=Skip Git (Local Only)', { timeout: 5000 });
      await page.click('text=Skip Git (Local Only)');
      await page.waitForSelector('[data-testid="workspace-name-input"]', { timeout: 5000 });
      await page.fill('[data-testid="workspace-name-input"]', 'Sidebar Test Workspace');
      await page.click('text=Create Workspace');
      await page.waitForSelector('text=Sidebar Test Workspace', { timeout: 10000 });
      
      // Force modal close if stuck
      await page.evaluate(() => {
        const modal = document.querySelector('.fixed.inset-0');
        if (modal) modal.remove();
      });
      
      await page.waitForTimeout(500);
      await page.click('button:has-text("API Testing")');
      await page.waitForSelector('[data-testid="api-testing-container"]', { timeout: 5000 });
    }

    // STEP 3: Measure sidebar width after navigation
    const afterNavigationWidth = await sidebar.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return {
        width: computedStyle.width,
        classList: Array.from(el.classList),
        offsetWidth: el.offsetWidth
      };
    });
    
    console.log('Sidebar width after API Testing navigation:', afterNavigationWidth);

    // STEP 4: Create multiple tabs to trigger the issue
    console.log('Step 4: Creating multiple tabs...');
    const widthMeasurements = [];
    
    // Try to create tabs or work with existing UI
    const newTabButton = page.locator('button:has-text("New Tab")').first();
    const createRequestButton = page.locator('[data-testid="create-request-button"]').first();
    
    for (let i = 0; i < 3; i++) {
      console.log(`Creating tab ${i + 1}...`);
      
      // Try to create a new tab or request
      if (await newTabButton.isVisible()) {
        await newTabButton.click();
      } else if (await createRequestButton.isVisible()) {
        await createRequestButton.click();
        await page.waitForTimeout(500);
      } else {
        console.log('No tab creation button found, working with existing tabs');
        break;
      }
      
      // Measure sidebar width after each tab creation
      const currentWidth = await sidebar.evaluate((el) => {
        const computedStyle = window.getComputedStyle(el);
        return {
          width: computedStyle.width,
          offsetWidth: el.offsetWidth,
          timestamp: Date.now()
        };
      });
      
      widthMeasurements.push({
        step: `After creating tab ${i + 1}`,
        ...currentWidth
      });
      
      console.log(`Sidebar width after tab ${i + 1}:`, currentWidth);
      
      // Small delay to see any transitions
      await page.waitForTimeout(300);
    }

    // STEP 5: Click between tabs rapidly to trigger width changes
    console.log('Step 5: Clicking between tabs rapidly...');
    
    const tabButtons = page.locator('[data-testid="request-tab"]');
    const tabCount = await tabButtons.count();
    
    if (tabCount > 1) {
      for (let i = 0; i < 5; i++) {
        const tabIndex = i % tabCount;
        console.log(`Clicking tab ${tabIndex}...`);
        
        // Measure width before click
        const beforeClick = await sidebar.evaluate((el) => ({
          offsetWidth: el.offsetWidth,
          timestamp: Date.now()
        }));
        
        // Click the tab
        await tabButtons.nth(tabIndex).click();
        await page.waitForTimeout(100); // Small delay for any animations
        
        // Measure width after click
        const afterClick = await sidebar.evaluate((el) => ({
          offsetWidth: el.offsetWidth,
          timestamp: Date.now()
        }));
        
        widthMeasurements.push({
          step: `Tab click ${i + 1} - Before`,
          ...beforeClick
        });
        
        widthMeasurements.push({
          step: `Tab click ${i + 1} - After`,
          ...afterClick
        });
        
        // Check for width changes
        if (beforeClick.offsetWidth !== afterClick.offsetWidth) {
          console.log(`🚨 WIDTH CHANGE DETECTED! Before: ${beforeClick.offsetWidth}px, After: ${afterClick.offsetWidth}px`);
          
          // Take a screenshot of the evidence
          await page.screenshot({
            path: `test-results/sidebar-width-change-evidence-${i + 1}.png`,
            fullPage: true
          });
        }
        
        console.log(`Tab ${tabIndex} click - Before: ${beforeClick.offsetWidth}px, After: ${afterClick.offsetWidth}px`);
      }
    } else {
      console.log('Not enough tabs to test clicking between them');
    }

    // STEP 6: Final width measurement
    const finalWidth = await sidebar.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return {
        width: computedStyle.width,
        classList: Array.from(el.classList),
        offsetWidth: el.offsetWidth
      };
    });
    
    console.log('Final sidebar width:', finalWidth);

    // STEP 7: Generate bug report
    console.log('\n=== BUG REPORT SUMMARY ===');
    console.log('Initial Width:', initialWidth.offsetWidth + 'px');
    console.log('Expected Width (when expanded):', '256px');
    console.log('Final Width:', finalWidth.offsetWidth + 'px');
    console.log('\nAll measurements:');
    widthMeasurements.forEach((measurement, index) => {
      console.log(`${index + 1}. ${measurement.step}: ${measurement.offsetWidth}px`);
    });

    // Check for any width inconsistencies
    const widthValues = widthMeasurements.map(m => m.offsetWidth);
    const uniqueWidths = [...new Set(widthValues)];
    
    if (uniqueWidths.length > 1) {
      console.log(`\n🚨 SIDEBAR WIDTH ISSUE CONFIRMED!`);
      console.log(`Found ${uniqueWidths.length} different width values: ${uniqueWidths.join(', ')}px`);
      console.log(`Expected: Consistent width of ~256px when expanded`);
      
      // This assertion will fail if there are width inconsistencies, proving the bug
      expect(uniqueWidths.length).toBe(1);
    } else {
      console.log(`\n✅ No width inconsistencies detected. Sidebar maintained consistent width: ${uniqueWidths[0]}px`);
    }

    // Save detailed report to file
    const report = {
      testName: 'Sidebar Width Bug Investigation',
      timestamp: new Date().toISOString(),
      initialWidth: initialWidth,
      finalWidth: finalWidth,
      allMeasurements: widthMeasurements,
      uniqueWidths: uniqueWidths,
      issueDetected: uniqueWidths.length > 1,
      summary: uniqueWidths.length > 1 
        ? `BUG CONFIRMED: Sidebar width fluctuated between ${Math.min(...uniqueWidths)}px and ${Math.max(...uniqueWidths)}px`
        : `No issues detected: Consistent width of ${uniqueWidths[0]}px`
    };

    // Log the report for the test output
    console.log('\n=== DETAILED REPORT ===');
    console.log(JSON.stringify(report, null, 2));
  });

  test('should verify sidebar CSS classes and layout structure', async ({ page }) => {
    console.log('=== SIDEBAR CSS ANALYSIS ===');
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 30000 });
    
    // Analyze the sidebar CSS structure
    const sidebarAnalysis = await page.evaluate(() => {
      const sidebar = document.querySelector('.bg-slate-50') || document.querySelector('[class*="bg-slate-50"]');
      if (!sidebar) return { error: 'Sidebar not found' };
      
      const computedStyle = window.getComputedStyle(sidebar);
      const parentStyle = window.getComputedStyle(sidebar.parentElement!);
      
      return {
        sidebarClasses: Array.from(sidebar.classList),
        computedStyles: {
          width: computedStyle.width,
          minWidth: computedStyle.minWidth,
          maxWidth: computedStyle.maxWidth,
          flexShrink: computedStyle.flexShrink,
          flexGrow: computedStyle.flexGrow,
          flexBasis: computedStyle.flexBasis,
          transition: computedStyle.transition
        },
        parentLayout: {
          display: parentStyle.display,
          flexDirection: parentStyle.flexDirection,
          alignItems: parentStyle.alignItems
        },
        boundingRect: {
          width: sidebar.getBoundingClientRect().width,
          height: sidebar.getBoundingClientRect().height
        }
      };
    });
    
    console.log('Sidebar CSS Analysis:', JSON.stringify(sidebarAnalysis, null, 2));
    
    // Check for potential CSS issues
    if (sidebarAnalysis.computedStyles?.transition?.includes('all')) {
      console.log('⚠️  WARNING: Sidebar uses transition-all which can cause layout issues');
    }
    
    if (sidebarAnalysis.computedStyles?.flexShrink !== '0') {
      console.log('⚠️  WARNING: Sidebar flex-shrink is not 0, may cause width instability');
    }
  });
});