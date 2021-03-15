const { __ } = wp.i18n;

export const STRING_OPERATIONS = {
	'=': __( 'is', 'altis-analytics' ),
	'!=': __( 'is not', 'altis-analytics' ),
	'*=': __( 'contains', 'altis-analytics' ),
	'!*': __( 'does not contain', 'altis-analytics' ),
	'^=': __( 'begins with', 'altis-analytics' ),
};

export const NUMERIC_OPERATIONS = {
	'=': __( 'is', 'altis-analytics' ),
	'!=': __( 'is not', 'altis-analytics' ),
	'gt': __( 'is greater than', 'altis-analytics' ),
	'gte': __( 'is greater than or equal to', 'altis-analytics' ),
	'lt': __( 'is less than', 'altis-analytics' ),
	'lte': __( 'is less than or equal to', 'altis-analytics' ),
};
