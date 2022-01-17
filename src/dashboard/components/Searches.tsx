import React from 'react';
import { __ } from '@wordpress/i18n';

import BreakdownBlock from './BreakdownBlock';
import { StatsResult } from '../util';

interface Props {
	data?: StatsResult,
}

export default function Searches( props: Props ) {
	const { data } = props;
	if ( ! data || ! data.stats || ! data.stats.by_search_term ) {
		return null;
	}

	const stats = Object.keys( data.stats.by_search_term ).map( key => ( {
		title: key,
		value: data.stats.by_search_term[ key ],
	} ) );

	return (
		<BreakdownBlock
			header={ {
				title: __( 'Search Terms', 'altis' ),
				value: __( 'Views', 'altis' ),
			} }
			items={ stats }
			maxItems={ 5 }
			showPercent={ false }
		/>
	);
}
