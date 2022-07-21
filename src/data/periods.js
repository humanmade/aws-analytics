import { __ } from '@wordpress/i18n';

/**
 * Date Periods. This is here to accomodate the split build process. The typescript copy should supersede this when appropriate.
 */
const periods = [
	{
		label: __( '7 days', 'altis' ),
		value: 7,
	},
	{
		label: __( '30 days', 'altis' ),
		value: 30,
	},
	{
		label: __( '90 days', 'altis' ),
		value: 90,
	},
];
export default periods;
