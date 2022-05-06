import React from 'react';

import BreakdownBlock from './BreakdownBlock';
import { Filter, StatsResult } from '../../util';

interface Props {
	data?: StatsResult,
	onUpdateFilter( callback: ( filter: Filter ) => Filter ): void,
}

export default function TopUrls( props: Props ) {
	const { data, onUpdateFilter } = props;
	if ( ! data ) {
		return null;
	}

	const stats = Object.keys( data.stats.by_url ).map( key => ( {
		title: key,
		value: data.stats.by_url[ key ],
		id: key,
	} ) );
	return (
		<BreakdownBlock
			header={ {
				title: 'Pages',
				value: 'Views',
			} }
			items={ stats }
			maxItems={ 5 }
			total={ data.stats.summary.views }
			onSelectItem={ item => onUpdateFilter( filter => ( {
				...filter,
				path: item.id,
			} ) ) }
		/>
	);
}
