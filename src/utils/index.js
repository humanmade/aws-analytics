/**
 * Utility functions.
 */

/**
 * Generate a UUID v4 string.
 */
export const uuid = placeholder =>
	placeholder
		? ( placeholder ^ ( ( Math.random() * 16 ) >> ( placeholder / 4 ) ) ).toString( 16 )
		: ( [ 1e7 ] + -1e3 + -4e3 + -8e3 + -1e11 ).replace( /[018]/g, uuid );

/**
 * Get a throttled version of a function to reduce event trigger rates.
 *
 * @param {int} delay Milliseconds to delay function call by.
 * @param {callable} fn Callback.
 */
export const throttle = ( delay, fn ) => {
	let lastCall = 0;
	return function ( ...args ) {
		const now = ( new Date() ).getTime();
		if ( now - lastCall < delay ) {
			return;
		}
		lastCall = now;
		return fn( ...args );
	};
};

/**
 * Get browser locale / language.
 */
export const getLanguage = () => ( navigator.language || navigator.browserLanguage || ( navigator.languages || [ 'en-US' ] )[ 0 ] ).toLowerCase();
