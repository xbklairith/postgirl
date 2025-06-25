import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';
import { render, resetMocks } from '../../test/utils';

describe('Select Component', () => {
  const mockOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    options: mockOptions,
    placeholder: 'Select an option...',
  };

  beforeEach(() => {
    resetMocks();
  });

  describe('Initial Render', () => {
    it('renders with placeholder when no value selected', () => {
      render(<Select {...defaultProps} />);
      
      expect(screen.getByText('Select an option...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('shows selected option when value is provided', () => {
      render(<Select {...defaultProps} value="option2" />);
      
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    it('shows chevron down icon', () => {
      render(<Select {...defaultProps} />);
      
      const chevron = document.querySelector('svg');
      expect(chevron).toBeInTheDocument();
    });
  });

  describe('Dropdown Interaction', () => {
    it('opens dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<Select {...defaultProps} />);
      
      const selectButton = screen.getByRole('button');
      await user.click(selectButton);
      
      // Dropdown should be open and show options
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });

    it('rotates chevron when opened', async () => {
      const user = userEvent.setup();
      render(<Select {...defaultProps} />);
      
      const selectButton = screen.getByRole('button');
      const chevron = document.querySelector('svg')!;
      
      // Initially not rotated
      expect(chevron).not.toHaveClass('rotate-180');
      
      await user.click(selectButton);
      
      // Should be rotated when open
      expect(chevron).toHaveClass('rotate-180');
    });

    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Select {...defaultProps} />
          <div data-testid="outside">Outside element</div>
        </div>
      );
      
      const selectButton = screen.getByRole('button');
      await user.click(selectButton);
      
      // Dropdown should be open
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      
      // Click outside
      await user.click(screen.getByTestId('outside'));
      
      // Dropdown should be closed
      expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
    });

    it('does not close dropdown when clicking inside dropdown portal', async () => {
      const user = userEvent.setup();
      render(<Select {...defaultProps} />);
      
      const selectButton = screen.getByRole('button');
      await user.click(selectButton);
      
      // Click on dropdown container (should not close)
      const dropdownPortal = document.querySelector('[data-dropdown-portal="select"]')!;
      fireEvent.mouseDown(dropdownPortal);
      
      // Dropdown should still be open
      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });
  });

  describe('Option Selection', () => {
    it('calls onChange when option is clicked', async () => {
      const user = userEvent.setup();
      render(<Select {...defaultProps} />);
      
      const selectButton = screen.getByRole('button');
      await user.click(selectButton);
      
      const option2 = screen.getByText('Option 2');
      await user.click(option2);
      
      expect(defaultProps.onChange).toHaveBeenCalledWith('option2');
    });

    it('closes dropdown after selection', async () => {
      const user = userEvent.setup();
      render(<Select {...defaultProps} />);
      
      const selectButton = screen.getByRole('button');
      await user.click(selectButton);
      
      const option1 = screen.getByText('Option 1');
      await user.click(option1);
      
      // Dropdown should be closed
      expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
    });

    it('shows check icon for selected option', async () => {
      const user = userEvent.setup();
      render(<Select {...defaultProps} value="option2" />);
      
      const selectButton = screen.getByRole('button');
      await user.click(selectButton);
      
      // Check icon should be present for selected option
      const selectedOption = screen.getByText('Option 2').closest('button')!;
      const checkIcon = selectedOption.querySelector('svg');
      expect(checkIcon).toBeInTheDocument();
    });

    it('highlights selected option with different styling', async () => {
      const user = userEvent.setup();
      render(<Select {...defaultProps} value="option2" />);
      
      const selectButton = screen.getByRole('button');
      await user.click(selectButton);
      
      const selectedOption = screen.getByText('Option 2').closest('button')!;
      expect(selectedOption).toHaveClass('bg-primary-50/60');
    });
  });

  describe('Keyboard Navigation', () => {
    it('opens dropdown with Enter key', async () => {
      const user = userEvent.setup();
      render(<Select {...defaultProps} />);
      
      const selectButton = screen.getByRole('button');
      selectButton.focus();
      
      await user.keyboard('{Enter}');
      
      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });

    it('supports tab navigation', async () => {
      const user = userEvent.setup();
      render(<Select {...defaultProps} />);
      
      await user.tab();
      
      const selectButton = screen.getByRole('button');
      expect(selectButton).toHaveFocus();
    });
  });

  describe('Disabled State', () => {
    it('does not open when disabled', async () => {
      const user = userEvent.setup();
      render(<Select {...defaultProps} disabled />);
      
      const selectButton = screen.getByRole('button');
      await user.click(selectButton);
      
      expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
    });

    it('shows disabled styling', () => {
      render(<Select {...defaultProps} disabled />);
      
      const selectButton = screen.getByRole('button');
      expect(selectButton).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<Select {...defaultProps} />);
      
      const selectButton = screen.getByRole('button');
      expect(selectButton).toHaveAttribute('type', 'button');
    });

    it('associates options with button', async () => {
      const user = userEvent.setup();
      render(<Select {...defaultProps} />);
      
      const selectButton = screen.getByRole('button');
      await user.click(selectButton);
      
      const options = screen.getAllByRole('button');
      // First button is the select trigger, rest are options
      expect(options).toHaveLength(4); // 1 trigger + 3 options
    });
  });

  describe('Portal Rendering', () => {
    it('renders dropdown in portal to document.body', async () => {
      const user = userEvent.setup();
      render(<Select {...defaultProps} />);
      
      const selectButton = screen.getByRole('button');
      await user.click(selectButton);
      
      // Dropdown should be rendered in portal
      const portal = document.querySelector('[data-dropdown-portal="select"]');
      expect(portal).toBeInTheDocument();
      expect(portal?.parentElement).toBe(document.body);
    });

    it('removes portal when dropdown closes', async () => {
      const user = userEvent.setup();
      render(<Select {...defaultProps} />);
      
      const selectButton = screen.getByRole('button');
      await user.click(selectButton);
      
      // Portal should exist
      expect(document.querySelector('[data-dropdown-portal="select"]')).toBeInTheDocument();
      
      // Close dropdown
      await user.click(selectButton);
      
      // Portal should be removed
      expect(document.querySelector('[data-dropdown-portal="select"]')).not.toBeInTheDocument();
    });
  });

  describe('Positioning', () => {
    it('positions dropdown below select button by default', async () => {
      const user = userEvent.setup();
      render(<Select {...defaultProps} />);
      
      const selectButton = screen.getByRole('button');
      await user.click(selectButton);
      
      const portal = document.querySelector('[data-dropdown-portal="select"]') as HTMLElement;
      expect(portal).toBeInTheDocument();
      expect(portal.style.position).toBe('fixed');
    });

    it('updates position on window resize', async () => {
      const user = userEvent.setup();
      render(<Select {...defaultProps} />);
      
      const selectButton = screen.getByRole('button');
      await user.click(selectButton);
      
      // Simulate window resize
      fireEvent(window, new Event('resize'));
      
      // Should still be positioned correctly
      const portal = document.querySelector('[data-dropdown-portal="select"]');
      expect(portal).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('applies small size classes', () => {
      render(<Select {...defaultProps} size="sm" />);
      
      const selectButton = screen.getByRole('button');
      expect(selectButton).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('applies large size classes', () => {
      render(<Select {...defaultProps} size="lg" />);
      
      const selectButton = screen.getByRole('button');
      expect(selectButton).toHaveClass('px-4', 'py-3', 'text-base');
    });

    it('defaults to medium size', () => {
      render(<Select {...defaultProps} />);
      
      const selectButton = screen.getByRole('button');
      expect(selectButton).toHaveClass('px-3', 'py-2', 'text-sm');
    });
  });
});