/**
 * Polyfills CustomEvent.
 */
( function () {
	if ( typeof window.CustomEvent === 'function' ) {
		return false;
	}

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
	log: function () { },
	warn: function () { },
	error: function () { },
};
