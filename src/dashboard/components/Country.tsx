import React from 'react';
import { __ } from '@wordpress/i18n';

import BreakdownBlock from './BreakdownBlock';
import { StatsResult } from '../../util';

interface Props {
	data?: StatsResult,
}

export default function Browsers( props: Props ) {
	const { data } = props;
	if ( ! data || ! data.stats || ! data.stats.by_country ) {
		return null;
	}

	const stats = Object.keys( data.stats.by_country ).map( key => ( {
		title: key,
		value: data.stats.by_country[ key ],
	} ) );

	return (
		<BreakdownBlock
			header={ {
				title: __( 'Country', 'altis' ),
				value: __( 'Views', 'altis' ),
			} }
			items={ stats }
			maxItems={ 5 }
			total={ data.stats.summary.views }
		/>
	);
}
