import { test, expect } from '@playwright/test';

test.describe('Sidebar Width Stability', () => {
  test('should maintain consistent sidebar width when switching navigation tabs', async ({ page }) => {
    console.log('=== SIDEBAR WIDTH STABILITY TEST ===');
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Find the sidebar element
    const sidebar = page.locator('.bg-slate-50.dark\\:bg-slate-800').first();
    await expect(sidebar).toBeVisible();

    // Ensure sidebar is expanded
    const isCollapsed = await sidebar.evaluate((el) => {
      return el.classList.contains('w-16');
    });
    
    if (isCollapsed) {
      // Try to expand if collapsed
      const expandButton = page.locator('button[title*="expand"], button[title*="Toggle"]').first();
      if (await expandButton.isVisible()) {
        await expandButton.click();
        await page.waitForTimeout(300);
      }
    }

    // Record initial sidebar width
    const initialWidth = await sidebar.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(el);
      return {
        offsetWidth: el.offsetWidth,
        boundingWidth: rect.width,
        computedWidth: computedStyle.width,
        flexShrink: computedStyle.flexShrink,
        minWidth: computedStyle.minWidth,
        maxWidth: computedStyle.maxWidth,
        classList: Array.from(el.classList)
      };
    });

    console.log('Initial sidebar state:', initialWidth);

    // Check that sidebar has proper CSS constraints
    expect(initialWidth.flexShrink).toBe('0'); // Should not shrink
    expect(initialWidth.offsetWidth).toBeGreaterThan(200); // Should be expanded (~256px)

    // Array to store width measurements
    const widthMeasurements = [
      { step: 'Initial', ...initialWidth }
    ];

    // Test navigation between tabs
    const navigationTabs = [
      { name: 'Workspaces', button: 'button:has-text("Workspaces")' },
      { name: 'API Testing', button: 'button:has-text("API Testing")' },
      { name: 'Environments', button: 'button:has-text("Environments")' }
    ];

    for (let i = 0; i < navigationTabs.length; i++) {
      const tab = navigationTabs[i];
      console.log(`Clicking ${tab.name} tab...`);

      // Measure width before click
      const beforeClick = await sidebar.evaluate((el) => ({
        offsetWidth: el.offsetWidth,
        boundingWidth: el.getBoundingClientRect().width,
        timestamp: Date.now()
      }));

      // Click the navigation tab
      await page.click(tab.button);
      await page.waitForTimeout(300); // Wait for any transitions

      // Measure width after click
      const afterClick = await sidebar.evaluate((el) => ({
        offsetWidth: el.offsetWidth,
        boundingWidth: el.getBoundingClientRect().width,
        timestamp: Date.now()
      }));

      widthMeasurements.push({
        step: `${tab.name} - Before`,
        ...beforeClick
      });

      widthMeasurements.push({
        step: `${tab.name} - After`,
        ...afterClick
      });

      // Check for width changes
      if (beforeClick.offsetWidth !== afterClick.offsetWidth) {
        console.log(`🚨 WIDTH CHANGE DETECTED on ${tab.name}! Before: ${beforeClick.offsetWidth}px, After: ${afterClick.offsetWidth}px`);
        
        // Take screenshot as evidence
        await page.screenshot({
          path: `test-results/sidebar-width-change-${tab.name.toLowerCase()}.png`,
          fullPage: true
        });
      } else {
        console.log(`✅ ${tab.name}: Width stable at ${afterClick.offsetWidth}px`);
      }

      // Additional wait to ensure layout is stable
      await page.waitForTimeout(200);
    }

    // Test rapid clicking to stress test
    console.log('Stress testing with rapid navigation...');
    for (let i = 0; i < 5; i++) {
      const tabIndex = i % navigationTabs.length;
      const tab = navigationTabs[tabIndex];
      
      const beforeRapid = await sidebar.evaluate((el) => ({
        offsetWidth: el.offsetWidth,
        timestamp: Date.now()
      }));

      await page.click(tab.button);
      await page.waitForTimeout(50); // Minimal wait

      const afterRapid = await sidebar.evaluate((el) => ({
        offsetWidth: el.offsetWidth,
        timestamp: Date.now()
      }));

      widthMeasurements.push({
        step: `Rapid ${i + 1} - ${tab.name}`,
        ...afterRapid
      });

      if (beforeRapid.offsetWidth !== afterRapid.offsetWidth) {
        console.log(`🚨 RAPID CLICK WIDTH CHANGE! ${tab.name}: ${beforeRapid.offsetWidth}px → ${afterRapid.offsetWidth}px`);
      }
    }

    // Final measurement
    const finalWidth = await sidebar.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(el);
      return {
        offsetWidth: el.offsetWidth,
        boundingWidth: rect.width,
        computedWidth: computedStyle.width,
        flexShrink: computedStyle.flexShrink,
        minWidth: computedStyle.minWidth,
        maxWidth: computedStyle.maxWidth
      };
    });

    widthMeasurements.push({
      step: 'Final',
      ...finalWidth
    });

    console.log('Final sidebar state:', finalWidth);

    // Analyze all measurements
    const allWidths = widthMeasurements.map(m => m.offsetWidth);
    const uniqueWidths = [...new Set(allWidths)];

    console.log('\n=== WIDTH STABILITY ANALYSIS ===');
    console.log('All measurements:');
    widthMeasurements.forEach((measurement, index) => {
      console.log(`${index + 1}. ${measurement.step}: ${measurement.offsetWidth}px`);
    });

    console.log(`\nUnique widths found: ${uniqueWidths.join(', ')}px`);
    console.log(`Width variations: ${uniqueWidths.length}`);

    // Generate final report
    if (uniqueWidths.length === 1) {
      console.log(`\n✅ SIDEBAR WIDTH STABLE! Consistent width: ${uniqueWidths[0]}px`);
    } else {
      console.log(`\n🚨 SIDEBAR WIDTH INSTABILITY DETECTED!`);
      console.log(`Expected: 1 consistent width`);
      console.log(`Actual: ${uniqueWidths.length} different widths`);
      console.log(`Range: ${Math.min(...uniqueWidths)}px - ${Math.max(...uniqueWidths)}px`);
    }

    // CSS validation
    expect(finalWidth.flexShrink).toBe('0');
    expect(finalWidth.minWidth).not.toBe('auto');
    expect(finalWidth.maxWidth).not.toBe('none');

    // Main assertion: sidebar should maintain consistent width
    expect(uniqueWidths.length).toBe(1);
    expect(uniqueWidths[0]).toBeGreaterThan(200); // Should be expanded width
  });

  test('should verify sidebar CSS properties prevent width changes', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 30000 });

    const sidebarCSS = await page.evaluate(() => {
      const sidebar = document.querySelector('.bg-slate-50') || document.querySelector('[class*="bg-slate-50"]');
      if (!sidebar) return { error: 'Sidebar not found' };

      const computedStyle = window.getComputedStyle(sidebar);
      return {
        width: computedStyle.width,
        minWidth: computedStyle.minWidth,
        maxWidth: computedStyle.maxWidth,
        flexShrink: computedStyle.flexShrink,
        flexGrow: computedStyle.flexGrow,
        flexBasis: computedStyle.flexBasis,
        transition: computedStyle.transition,
        classList: Array.from(sidebar.classList)
      };
    });

    console.log('Sidebar CSS Properties:', JSON.stringify(sidebarCSS, null, 2));

    // Verify CSS properties that prevent width instability
    expect(sidebarCSS.flexShrink).toBe('0'); // Critical: prevents shrinking
    expect(sidebarCSS.minWidth).not.toBe('auto'); // Should have explicit min-width
    expect(sidebarCSS.maxWidth).not.toBe('none'); // Should have explicit max-width
    
    // Check for transition-all (should be avoided)
    if (sidebarCSS.transition?.includes('all')) {
      console.log('⚠️ WARNING: sidebar still uses transition-all');
    } else {
      console.log('✅ Sidebar uses specific transition (not transition-all)');
    }

    // Verify flex-shrink-0 class is present
    expect(sidebarCSS.classList).toContain('flex-shrink-0');
  });
});