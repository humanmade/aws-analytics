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

/**
 * Array merge function for deepmerge.
 *
 * @param {Array} destinationArray
 * @param {Array} sourceArray
 */
export const overwriteMerge = ( destinationArray, sourceArray ) => sourceArray;

/**
 * Resolves an attribute or metric value and sanitize it.
 *
 * @param {mixed} value
 * @param {Function} sanitizeCallback
 */
const prepareData = async ( value, sanitizeCallback ) => {
	if ( typeof value === 'function' ) {
		value = await value();
	}
	return sanitizeCallback( value );
};

/**
 * Ensure value is an array of strings.
 *
 * @param {mixed} value
 */
const sanitizeAttribute = value => Array.isArray( value )
	? value.map( val => val.toString() )
	: [ value.toString() ];

/**
 * Ensure value is a single float.
 *
 * @param {mixed} value
 */
const sanitizeMetric = value => parseFloat( Number( Array.isArray( value ) ? value[0] : value ) );

/**
 * Prepares an object for inclusion in endpoint data or event data.
 *
 * @param {Object} attributes
 * @param {String} prefix Optional prefix to prepend to the object property name.
 */
export const prepareAttributes = async ( attributes, prefix = '' ) => {
	const sanitized = {};
	for ( const name in attributes ) {
		sanitized[ `${prefix}${name}` ] = await prepareData( attributes[ name ], sanitizeAttribute );
	}
	return sanitized;
};

/**
 * Prepares an object for inclusion in endpoint data or event data.
 *
 * @param {Object} attributes
 * @param {String} prefix Optional prefix to prepend to the object property name.
 */
export const prepareMetrics = async ( metrics, prefix = '' ) => {
	const sanitized = {};
	for ( const name in metrics ) {
		sanitized[ `${prefix}${name}` ] = await prepareData( metrics[ name ], sanitizeMetric );
	}
	return sanitized;
};
