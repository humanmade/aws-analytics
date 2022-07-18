import { __ } from '@wordpress/i18n';

/**
 * Date Periods. This is here to accomodate the split build process. The typescript copy should supersede this when appropriate.
 */
const periods = [
	{
		label: __( '7 days', 'altis' ),
		value: 'P7D',
		diff: 'P7D',
		number: 7,
	},
	{
		label: __( '30 days', 'altis' ),
		value: 'P30D',
		diff: 'P30D',
		number: 30,
	},
	{
		label: __( '90 days', 'altis' ),
		value: 'P90D',
		diff: null,
		number: 90,
	},
];
export default periods;
