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
