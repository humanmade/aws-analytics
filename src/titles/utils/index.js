export const getLetter = index => ( 'abcdefghijklmnopqrstuvwxyz'.toUpperCase() )[ Math.max( 0, Math.min( index, 26 ) ) ];

export const getDateString = date => moment( date ).format( 'MMMM D, YYYY — HH:mm' );

export const getDurationString = elapsed => {
	const days = Math.floor( elapsed / ( 24 * 60 * 60 * 1000 ) );
	const hours = Math.floor( ( elapsed - ( days * ( 24 * 60 * 60 * 1000 ) ) ) / ( 60 * 60 * 1000 ) );
	const minutes = Math.floor( ( elapsed - ( days * ( 24 * 60 * 60 * 1000 ) ) - ( hours * ( 60 * 60 * 1000 ) ) ) / ( 60 * 1000 ) );
	return `${ days }d ${ hours }h ${ minutes }m`;
};

export const arrayEquals = ( array1, array2 ) =>
	array1.length === array2.length &&
	array1.every( ( value, index ) => value === array2[ index ] );
