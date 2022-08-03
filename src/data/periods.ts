import { __ } from '@wordpress/i18n';

import { Duration } from '../util';

export type Periods = {
	diff: Duration | null,
	label: string,
	value: Duration,
	interval: string,
}[];

export const periods: Periods = [
	{
		label: __( '7 Days', 'altis' ),
		value: 'P7D',
		diff: 'P7D',
		interval: '4h',
	},
	{
		label: __( '30 Days', 'altis' ),
		value: 'P30D',
		diff: 'P30D',
		interval: '1d',
	},
	{
		label: __( '90 Days', 'altis' ),
		value: 'P90D',
		diff: null,
		interval: '1d',
	},
];
