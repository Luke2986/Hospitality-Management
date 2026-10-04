(function() {
  'use strict';

  // Get the widget URL from global config or default to current origin
  const WIDGET_URL = window.BOOKING_WIDGET_URL || window.location.origin;
  const WIDGET_ORIGIN = new URL(WIDGET_URL, window.location.href).origin;

  // Find all widget containers on the page
  const containers = document.querySelectorAll('[data-booking-widget]');

  containers.forEach(function(container) {
    const propertyId = container.getAttribute('data-property-id');
    
    if (!propertyId) {
      console.error('Booking Widget: data-property-id attribute is required');
      return;
    }

    // Create iframe element
    const iframe = document.createElement('iframe');
    iframe.src = `${WIDGET_URL}/widget/${propertyId}`;
    iframe.style.width = '100%';
    iframe.style.border = 'none';
    iframe.style.height = '600px';
    iframe.style.transition = 'height 0.3s ease';
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('data-booking-widget-iframe', propertyId);

    // Handle iframe messages for auto-resize
    function handleMessage(event) {
      if (event.origin !== WIDGET_ORIGIN || event.source !== iframe.contentWindow) return;

      if (event.data && event.data.type === 'booking-widget-resize') {
        const newHeight = event.data.height;
        if (typeof newHeight === 'number' && newHeight > 0 && newHeight < 20000) {
          iframe.style.height = newHeight + 'px';
        }
      }

      if (event.data && event.data.type === 'booking-widget-modal-open') {
        const rect = iframe.getBoundingClientRect();
        window.scrollTo({
          top: window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2,
          behavior: 'smooth',
        });
      }
    }

    // Listen for resize messages
    window.addEventListener('message', handleMessage);

    // Insert iframe into container
    container.appendChild(iframe);

    // Optional: Loading state
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = 'padding: 40px; text-align: center; color: #666; font-family: sans-serif;';
    loadingDiv.textContent = 'Caricamento widget prenotazioni...';
    container.insertBefore(loadingDiv, iframe);

    iframe.addEventListener('load', function() {
      loadingDiv.style.display = 'none';
    });

    // Cleanup function (optional, for SPAs)
    container._widgetCleanup = function() {
      window.removeEventListener('message', handleMessage);
    };
  });

  // Console log for debugging
  console.log(`Booking Widget: Initialized ${containers.length} widget(s)`);
})();
