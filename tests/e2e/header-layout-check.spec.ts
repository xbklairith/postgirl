import { test, expect } from '@playwright/test';

test.describe('Header Layout Visual Check', () => {
  test('should verify workspace dropdown positioning in header', async ({ page }) => {
    console.log('=== HEADER LAYOUT VISUAL CHECK ===');
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Take full page screenshot first
    await page.screenshot({
      path: 'test-results/header-layout-full.png',
      fullPage: true
    });

    // Analyze header layout
    const headerAnalysis = await page.evaluate(() => {
      const header = document.querySelector('.header');
      const headerContainer = header?.querySelector('.flex.items-center.justify-between');
      const leftSection = headerContainer?.children[0];
      const rightSection = headerContainer?.children[1];
      const workspaceSelector = document.querySelector('[data-testid="workspace-selector"]');
      
      if (!header || !headerContainer || !workspaceSelector) {
        return { error: 'Required elements not found' };
      }

      const headerRect = header.getBoundingClientRect();
      const leftRect = leftSection?.getBoundingClientRect();
      const rightRect = rightSection?.getBoundingClientRect();
      const workspaceSelectorRect = workspaceSelector.getBoundingClientRect();

      return {
        header: {
          width: headerRect.width,
          height: headerRect.height,
          left: headerRect.left,
          right: headerRect.right
        },
        leftSection: leftRect ? {
          width: leftRect.width,
          left: leftRect.left,
          right: leftRect.right
        } : null,
        rightSection: rightRect ? {
          width: rightRect.width,
          left: rightRect.left,
          right: rightRect.right
        } : null,
        workspaceSelector: {
          width: workspaceSelectorRect.width,
          left: workspaceSelectorRect.left,
          right: workspaceSelectorRect.right,
          distanceFromHeaderRight: headerRect.right - workspaceSelectorRect.right,
          isInRightSection: rightSection?.contains(workspaceSelector) || false
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };
    });

    console.log('Header Layout Analysis:', JSON.stringify(headerAnalysis, null, 2));

    // Check workspace selector positioning
    if (headerAnalysis.workspaceSelector) {
      const { workspaceSelector, header } = headerAnalysis;
      
      console.log(`Workspace selector distance from right edge: ${workspaceSelector.distanceFromHeaderRight}px`);
      console.log(`Workspace selector is in right section: ${workspaceSelector.isInRightSection}`);
      
      // Visual verification - should be close to right edge
      if (workspaceSelector.distanceFromHeaderRight > 50) {
        console.log('⚠️  WARNING: Workspace dropdown is not close enough to right edge');
        console.log(`Expected: < 50px from right, Actual: ${workspaceSelector.distanceFromHeaderRight}px`);
      }
      
      if (!workspaceSelector.isInRightSection) {
        console.log('⚠️  WARNING: Workspace selector is not in the right section of header');
      }
    }

    // Take a focused screenshot of just the header
    const headerElement = page.locator('.header').first();
    await headerElement.screenshot({
      path: 'test-results/header-layout-focused.png'
    });

    // Check if theme toggle is in sidebar (not header)
    const themeInHeader = await page.locator('.header button:has-text("🌙"), .header button:has-text("☀️")').count();
    const themeInSidebar = await page.locator('.bg-slate-50 button:has-text("🌙"), .bg-slate-50 button:has-text("☀️")').count();
    
    console.log(`Theme toggle in header: ${themeInHeader}`);
    console.log(`Theme toggle in sidebar: ${themeInSidebar}`);
    
    if (themeInHeader > 0) {
      console.log('⚠️  WARNING: Theme toggle still appears in header');
    }
    
    if (themeInSidebar === 0) {
      console.log('⚠️  WARNING: Theme toggle not found in sidebar');
    }

    // Check workspace dropdown visual placement
    const workspaceButton = page.locator('[data-testid="workspace-selector"]');
    await expect(workspaceButton).toBeVisible();
    
    // Highlight the workspace selector for visual confirmation
    await workspaceButton.evaluate((el) => {
      el.style.outline = '3px solid red';
      el.style.outlineOffset = '2px';
    });

    // Take screenshot with highlighted workspace selector
    await page.screenshot({
      path: 'test-results/workspace-selector-highlighted.png',
      fullPage: false
    });

    // Check header structure
    const headerStructure = await page.evaluate(() => {
      const header = document.querySelector('.header .flex.items-center.justify-between');
      if (!header) return { error: 'Header structure not found' };
      
      return {
        children: Array.from(header.children).map((child, index) => ({
          index,
          className: child.className,
          innerHTML: child.innerHTML.substring(0, 100) + '...',
          width: child.getBoundingClientRect().width
        }))
      };
    });

    console.log('Header Structure:', JSON.stringify(headerStructure, null, 2));

    // Test workspace dropdown opening
    console.log('Testing workspace dropdown...');
    await workspaceButton.click();
    await page.waitForTimeout(500);
    
    // Check if dropdown appeared
    const dropdown = page.locator('[data-testid="workspace-dropdown"]');
    if (await dropdown.isVisible()) {
      console.log('✅ Workspace dropdown opens correctly');
      
      // Take screenshot with dropdown open
      await page.screenshot({
        path: 'test-results/workspace-dropdown-open.png',
        fullPage: true
      });
      
      // Analyze dropdown positioning
      const dropdownAnalysis = await page.evaluate(() => {
        const dropdown = document.querySelector('[data-testid="workspace-dropdown"]');
        const button = document.querySelector('[data-testid="workspace-selector"]');
        
        if (!dropdown || !button) return { error: 'Elements not found' };
        
        const dropdownRect = dropdown.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        
        return {
          dropdown: {
            width: dropdownRect.width,
            left: dropdownRect.left,
            right: dropdownRect.right,
            top: dropdownRect.top
          },
          button: {
            width: buttonRect.width,
            left: buttonRect.left,
            right: buttonRect.right,
            bottom: buttonRect.bottom
          },
          alignment: {
            leftAligned: Math.abs(dropdownRect.left - buttonRect.left) < 5,
            rightAligned: Math.abs(dropdownRect.right - buttonRect.right) < 5,
            dropdownWiderThanButton: dropdownRect.width > buttonRect.width
          }
        };
      });
      
      console.log('Dropdown Analysis:', JSON.stringify(dropdownAnalysis, null, 2));
      
      // Close dropdown
      await page.click('body');
    } else {
      console.log('❌ Workspace dropdown did not open');
    }

    // Generate final report
    console.log('\n=== HEADER LAYOUT REPORT ===');
    console.log('1. Workspace Selector Position:', headerAnalysis.workspaceSelector?.isInRightSection ? '✅ In right section' : '❌ Not in right section');
    console.log('2. Distance from right edge:', `${headerAnalysis.workspaceSelector?.distanceFromHeaderRight}px`);
    console.log('3. Theme toggle in header:', themeInHeader > 0 ? '❌ Still in header' : '✅ Removed from header');
    console.log('4. Theme toggle in sidebar:', themeInSidebar > 0 ? '✅ In sidebar' : '❌ Not in sidebar');
    
    // Assert that workspace selector should be in right section and close to edge
    expect(headerAnalysis.workspaceSelector?.isInRightSection).toBe(true);
    expect(headerAnalysis.workspaceSelector?.distanceFromHeaderRight).toBeLessThan(30);
  });
});