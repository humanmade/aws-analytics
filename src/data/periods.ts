import { __ } from '@wordpress/i18n';

import { Duration } from '../util';

type Periods = {
	diff: Duration | null,
	label: string,
	value: Duration,
}[];

export const periods: Periods = [
	{
		label: __( '7 days', 'altis' ),
		value: 'P7D',
		diff: 'P7D',
	},
	{
		label: __( '30 days', 'altis' ),
		value: 'P30D',
		diff: 'P30D',
	},
	{
		label: __( '90 days', 'altis' ),
		value: 'P90D',
		diff: null,
	},
];
