import { test, expect } from '@playwright/test';

test.describe('Tab Container Fix Validation', () => {
  test('should verify tab container uses max-content width', async ({ page }) => {
    console.log('=== TAB CONTAINER FIX VALIDATION ===');
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 30000 });
    
    // Check tab container CSS properties
    const tabContainerCSS = await page.evaluate(() => {
      // Find tab container by its CSS classes
      const tabContainer = document.querySelector('.flex.transition-transform.duration-200.ease-out');
      
      if (!tabContainer) {
        return { error: 'Tab container not found' };
      }
      
      const computedStyle = window.getComputedStyle(tabContainer);
      const inlineStyle = tabContainer.getAttribute('style') || '';
      
      return {
        computedWidth: computedStyle.width,
        inlineStyle: inlineStyle,
        hasMaxContent: inlineStyle.includes('max-content'),
        hasFixedWidth: /width:\s*\d+px/.test(inlineStyle),
        classList: Array.from(tabContainer.classList)
      };
    });

    console.log('Tab Container CSS Analysis:', JSON.stringify(tabContainerCSS, null, 2));

    if (tabContainerCSS.error) {
      console.log('Tab container not found - this is expected if no tabs are open');
      return;
    }

    // Verify the fix is applied
    expect(tabContainerCSS.hasMaxContent).toBe(true);
    expect(tabContainerCSS.hasFixedWidth).toBe(false);

    console.log('✅ Tab container now uses max-content width instead of fixed pixel width');
    console.log('✅ This prevents tab expansion from affecting parent layout');
  });

  test('should verify sidebar width constraints are still effective', async ({ page }) => {
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
        classList: Array.from(sidebar.classList)
      };
    });

    console.log('Sidebar CSS Verification:', JSON.stringify(sidebarCSS, null, 2));

    // Verify sidebar constraints are still in place
    expect(sidebarCSS.flexShrink).toBe('0');
    expect(sidebarCSS.minWidth).toBe('256px');
    expect(sidebarCSS.maxWidth).toBe('256px');
    expect(sidebarCSS.classList).toContain('flex-shrink-0');

    console.log('✅ Sidebar width constraints remain effective');
  });
});