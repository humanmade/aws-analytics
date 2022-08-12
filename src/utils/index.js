/**
 * Utility functions.
 */

/**
 * Generate a UUID v4 string.
 *
 * @param {?number} placeholder UUID placeholder.
 * @returns {string} A new UUID.
 */
export const uuid = placeholder => {
	if ( typeof window.crypto === 'object' ) {
		return window.crypto.randomUUID();
	}
	return placeholder
		? ( placeholder ^ ( ( Math.random() * 16 ) >> ( placeholder / 4 ) ) ).toString( 16 )
		: ( [ 1e7 ] + -1e3 + -4e3 + -8e3 + -1e11 ).replace( /[018]/g, uuid );
};

/**
 * Escapes only unicode characters to support auth signature generation.
 *
 * @param {string} str String to escapte unicode characters in.
 * @returns {string} Escaped string.
 */
export const escapeUnicode = str => {
	return str.replace( /[^\0-~]/g, ch => {
		return '\\u' + ( '000' + ch.charCodeAt().toString( 16 ) ).slice( -4 );
	} );
};

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
	? value.map( val => escapeUnicode( val.toString() ) )
	: escapeUnicode( value.toString() );

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

/**
 * Convert a number into a short string representation eg 3k.
 *
 * @param {number} metric The metric to get a condensed version of.
 * @param {string} suffix The unit or suffix to append.
 * @returns {string} The metric compacted for display.
 */
export const compactMetric = ( metric, suffix = '' ) => {
	if ( isNaN( metric ) ) {
		return '0';
	}

	// Infinity can happen with percentage calculations.
	if ( ! isFinite( metric ) ) {
		return '';
	}

	let volumeSuffix = '';
	let value = metric;
	const positiveMetric = metric < 0 ? metric * -1 : metric;

	// Thousands.
	if ( positiveMetric >= 1000 ) {
		volumeSuffix = 'k';
		value = metric / 1000;
	}

	// Millions.
	if ( positiveMetric >= 1000000 ) {
		volumeSuffix = 'M';
		value = metric / 1000000;
	}

	// Below 10 we use a fixed single decimal point eg. 2.3k, 1.4M.
	if ( value < 10 && value > -10 ) {
		value = ! Number.isInteger( value ) ? parseFloat( value.toFixed( 1 ) ) : value;
	} else {
		value = Math.round( value );
	}

	return `${ value }${ volumeSuffix }${ suffix }`;
};

/**
 * Get the percentage change between 2 numbers.
 *
 * @param {number} current Current value.
 * @param {*} previous Previous value.
 * @returns {number} The percentage change between the values.
 */
export const getLift = ( current, previous ) => {
	return ( ( current - previous ) / current ) * 100;
};

/**
 * Format a number.
 *
 * @param {number} number The number to format.
 * @returns {string} Formatted number.
 */
export const formatNumber = number => {
	return new Intl.NumberFormat().format( number );
};

/**
 * Detect if the current request is likely to be a bot.
 *
 * @param {string} userAgent Current user agent string.
 * @returns {boolean} True if UA is likely to be from a bot.
 */
export const detectRobot = userAgent => {
	const robots = new RegExp( [
		/bot/, /spider/, /crawl/,                          // GENERAL TERMS
		/APIs-Google/, /AdsBot/, /Googlebot/,              // GOOGLE ROBOTS
		/mediapartners/, /Google Favicon/,
		/FeedFetcher/, /Google-Read-Aloud/,
		/DuplexWeb-Google/, /googleweblight/,
		/bing/, /yandex/, /baidu/, /duckduck/, /yahoo/,    // OTHER ENGINES
		/ecosia/, /ia_archiver/,
		/facebook/, /instagram/, /pinterest/, /reddit/,    // SOCIAL MEDIA
		/slack/, /twitter/, /whatsapp/, /youtube/,
		/semrush/,                                         // OTHER
	].map( r => r.source ).join( '|' ), 'i' );             // BUILD REGEXP + "i" FLAG

	return robots.test( userAgent );
};

/**
 * Get a letter of the alphabet corresponding to an array index.
 *
 * @param {number} index Index of alphabet to return letter from.
 * @returns {string} A letter of the alphabet.
 */
export const getLetter = index => ( 'abcdefghijklmnopqrstuvwxyz'.toUpperCase() )[ Math.max( 0, Math.min( index, 26 ) ) ];

/**
 * Get a formatted date string.
 *
 * @param {Date} date JavaScript date object.
 * @returns {string} Formatted date string.
 */
export const getDateString = date => moment( date ).format( 'MMMM D, YYYY — HH:mm' );

/**
 * Get a duration string.
 *
 * @param {number} elapsed Elapsed time in seconds.
 * @returns {string} The duration string.
 */
export const getDurationString = elapsed => {
	const days = Math.floor( elapsed / ( 24 * 60 * 60 * 1000 ) );
	const hours = Math.floor( ( elapsed - ( days * ( 24 * 60 * 60 * 1000 ) ) ) / ( 60 * 60 * 1000 ) );
	const minutes = Math.floor( ( elapsed - ( days * ( 24 * 60 * 60 * 1000 ) ) - ( hours * ( 60 * 60 * 1000 ) ) ) / ( 60 * 1000 ) );
	return `${ days }d ${ hours }h ${ minutes }m`;
};

/**
 * Compare two arrays for equality.
 *
 * @param {Array} array1 First array.
 * @param {Array} array2 Array to compare with.
 * @returns {boolean} True if the arrays are equivalent.
 */
export const arrayEquals = ( array1, array2 ) =>
	 array1.length === array2.length &&
	 array1.every( ( value, index ) => value === array2[ index ] );

/**
 * Updates an array element given its index.
 *
 * @param {Array} arr Elements array.
 * @param {string} value The updated element string.
 * @param {number} index The array index of the element to update.
 * @returns {Array} The updated array.
 */
export const replaceElement = ( arr = [], value = '', index = 0 ) => {
	const newArray = [ ...arr ];
	newArray[ index ] = value;
	return newArray;
};

/**
 * Remove an array element.
 *
 * @param {Array} arr Elements array.
 * @param {number} index The index of the element to remove.
 * @returns {Array} The updated array.
 */
export const removeElement = ( arr, index ) => {
	const newArray = [ ...arr ];
	newArray.splice( index, 1 );
	return newArray;
};
