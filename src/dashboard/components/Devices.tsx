import React from 'react';
import { __ } from '@wordpress/i18n';

import BreakdownBlock from './BreakdownBlock';
import { StatsResult } from '../util';

interface Props {
	data?: StatsResult,
}

export default function Devices( props: Props ) {
	const { data } = props;
	if ( ! data ) {
		return null;
	}

	const stats = Object.keys( data.stats.by_os ).map( key => ( {
		title: key,
		value: data.stats.by_os[ key ],
	} ) );

	return (
		<BreakdownBlock
			header={ {
				title: __( 'Operating System', 'altis' ),
				value: __( 'Views', 'altis' ),
			} }
			items={ stats }
			maxItems={ 5 }
			total={ data.stats.summary.views }
		/>
	);
}
