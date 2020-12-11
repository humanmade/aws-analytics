/**
 * Polyfills CustomEvent.
 */
( function () {
	if ( typeof window.CustomEvent === 'function' ) {
		return false;
	}

	/**
	 * Creates a custom event handler.
	 *
	 * @param {string} event The event name.
	 * @param {object} params The event options.
	 * @returns {Event} The new custom event.
	 */
	function CustomEvent( event, params ) {
		params = params || {
			bubbles: false,
			cancelable: false,
			detail: null,
		};
		let evt = document.createEvent( 'CustomEvent' );
		evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
		return evt;
	}

	window.CustomEvent = CustomEvent;
} )();

window.console = window.console || {
	/**
	 *
	 */
	log: function () { },
	/**
	 *
	 */
	warn: function () { },
	/**
	 *
	 */
	error: function () { },
};
