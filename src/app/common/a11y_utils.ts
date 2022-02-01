// Focuses element if it's focusable, or the first child of element that is
// focusable.
export function focusElement(element: HTMLElement) {
  const focusableElementSelectors = [ 
    'a', 'button', 'input', 'textarea', 'select', 'details',
    '[tabindex]:not([tabindex="-1"])'
  ];
  if ((element.hasAttribute('tabindex')
       && element.getAttribute('tabindex')! !== '-1' )
      || focusableElementSelectors.includes(element.tagName.toLowerCase())) {
    element.focus();
  } else {
    const focusableChildren = element.querySelectorAll(
      focusableElementSelectors.join(', '));
    if (focusableChildren.length) {
      (focusableChildren[0] as HTMLElement).focus();
    }
  }
}
