import React from 'react';
import { __ } from '@wordpress/i18n';

import BreakdownBlock from './BreakdownBlock';
import { StatsResult } from '../util';

interface Props {
	data?: StatsResult,
}

export default function Referrers( props: Props ) {
	const { data } = props;
	if ( ! data || ! data.stats || ! data.stats.by_referer ) {
		return null;
	}

	const stats = Object.keys( data.stats.by_referer ).map( key => ( {
		title: key,
		value: data.stats.by_referer[ key ],
	} ) );

	return (
		<BreakdownBlock
			header={ {
				title: __( 'Referrer', 'altis' ),
				value: __( 'Views', 'altis' ),
			} }
			items={ stats }
			maxItems={ 5 }
			total={ data.stats.summary.views }
		/>
	);
}
