import React, { useState } from 'react';
import { __ } from '@wordpress/i18n';

import Welcome from './Welcome';
import List from '../components/List';
import { InitialData, Duration } from '../../util';

import HeroChart from './HeroChart';

interface Props {
	postTypes: InitialData['postTypes'],
	user: InitialData[ 'user' ],
}

export default function Dashboard ( props: Props ) {
	const [ period, setPeriod ] = useState<Duration>( 'P7D' );

	return (
		<div className="Dashboard">
			<Welcome user={ props.user } />
			<HeroChart period={ period } />
			<List
				listId="Content Explorer"
				searchPlaceholder={ __( 'Search Pages, Posts & Blocks', 'altis' ) }
				postTypes={ props.postTypes }
				currentUser={ props.user }
				period={ period }
				setPeriod={ setPeriod }
				filters={ [ 'all', 'blocks', 'mine' ] }
			/>
		</div>
	)
}
