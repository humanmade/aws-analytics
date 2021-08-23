/**
 * Utility functions.
 */

/**
 * Generate a UUID v4 string.
 *
 * @param {?number} placeholder UUID placeholder.
 * @returns {string} A new UUID.
 */
export const uuid = placeholder =>
	placeholder
		? ( placeholder ^ ( ( Math.random() * 16 ) >> ( placeholder / 4 ) ) ).toString( 16 )
		: ( [ 1e7 ] + -1e3 + -4e3 + -8e3 + -1e11 ).replace( /[018]/g, uuid );

/**
 * Get a throttled version of a function to reduce event trigger rates.
 *
 * @param {number} delay Milliseconds to delay function call by.
 * @param {Function} fn Callback.
 * @returns {Function} Throttled function.
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
 *
 * @returns {string} The browser locale code.
 */
export const getLanguage = () => ( navigator.language || navigator.browserLanguage || ( navigator.languages || [ 'en_US' ] )[ 0 ] ).toLowerCase().replace( '-', '_' );

/**
 * Array merge function for deepmerge.
 *
 * @param {Array} destinationArray The array to merge into.
 * @param {Array} sourceArray The original array.
 * @returns {Array} The original array.
 */
export const overwriteMerge = ( destinationArray, sourceArray ) => sourceArray;

/**
 * Resolves an attribute or metric value and sanitize it.
 *
 * @param {*} value Property value.
 * @param {Function} sanitizeCallback Callback to correct the type.
 * @returns {*} Sanitized value.
 */
const prepareData = async ( value, sanitizeCallback ) => {
	if ( typeof value === 'function' ) {
		value = await value();
	}
	return sanitizeCallback( value );
};

/**
 * Ensure value is a string or array of strings.
 *
 * @param {*} value Attribute to sanitize.
 * @returns {string} Attribute value as a string.
 */
const sanitizeAttribute = value => Array.isArray( value )
	? value.map( val => val.toString() )
	: value.toString();

/**
 * Ensure value is a single float.
 *
 * @param {*} value Metric to sanitize.
 * @returns {number} Sanitized metric value.
 */
const sanitizeMetric = value => parseFloat( Number( Array.isArray( value ) ? value[0] : value ) );

/**
 * Prepares an object for inclusion in endpoint data or event data.
 *
 * @param {object} attributes Attributes object.
 * @param {boolean} asArray If true ensure an array of strings is returned for each property.
 * @returns {object} The sanitized attributes.
 */
export const prepareAttributes = async ( attributes, asArray = false ) => {
	const sanitized = {};
	for ( const name in attributes ) {
		const value = Array.isArray( attributes[ name ] ) ? attributes[ name ] : [ attributes[ name ] ];
		if ( asArray ) {
			sanitized[ name ] = await prepareData( value, sanitizeAttribute );
		} else {
			sanitized[ name ] = await prepareData( value[0], sanitizeAttribute );
		}
	}
	return sanitized;
};

/**
 * Prepares an object for inclusion in endpoint data or event data.
 *
 * @param {object} metrics Metrics object.
 * @returns {object} Sanitized metrics object.
 */
export const prepareMetrics = async metrics => {
	const sanitized = {};
	for ( const name in metrics ) {
		sanitized[ name ] = await prepareData( metrics[ name ], sanitizeMetric );
	}
	return sanitized;
};
